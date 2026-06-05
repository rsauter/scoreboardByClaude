require('dotenv').config();

const { PrismaClient } = require('./generated/prisma');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// ─── Teams API ────────────────────────────────────────────────────────────────
app.get('/api/teams', async (req, res) => {
  try {
    const teams = await prisma.team.findMany({ orderBy: { name: 'asc' } });
    res.json(teams);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/teams', async (req, res) => {
  const { name, abbreviation, color, organization } = req.body;
  if (!name) return res.status(400).json({ error: 'Name ist pflicht' });
  try {
    const team = await prisma.team.create({ data: { name, abbreviation: abbreviation || '', color: color || '#00d4ff', organization: organization || '' } });
    res.status(201).json(team);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/teams/:id', async (req, res) => {
  const { name, abbreviation, color, organization } = req.body;
  if (!name) return res.status(400).json({ error: 'Name ist pflicht' });
  try {
    const team = await prisma.team.update({ where: { id: parseInt(req.params.id) }, data: { name, abbreviation: abbreviation || '', color: color || '#00d4ff', organization: organization || '' } });
    res.json(team);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/teams/:id', async (req, res) => {
  try {
    await prisma.team.delete({ where: { id: parseInt(req.params.id) } });
    res.status(204).send();
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── Other API features ───────────────────────────────────────────────────────
app.get('/api/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ db: 'ok' });
  } catch (e) {
    res.json({ db: 'error' });
  }
});

// ─── Game State (In-Memory) ───────────────────────────────────────────────────
let state = createInitialState();
let currentMatchId = null; // ID des aktiven Match in der DB

function createInitialState() {
  return {
    gameMode: '3x20',
    periodDuration: 20 * 60,
    breakDuration: 10 * 60,
    otDuration: 5 * 60,
    homeTeam: 'Heim',
    awayTeam: 'Gast',
    homeScore: 0,
    awayScore: 0,
    phase: 'pregame',
    currentPeriod: 1,
    timeRemaining: 20 * 60,
    running: false,
    penalties: [],
    homeTimeouts: 1,
    awayTimeouts: 1,
    timeoutActive: null,
    timeoutRemaining: 30,
    homeShootout: 0,
    awayShootout: 0,
    lastTick: null,
  };
}

// ─── Crash Recovery: State in DB speichern ───────────────────────────────────
async function saveStateToDb() {
  if (!currentMatchId) return;
  try {
    await prisma.match.update({
      where: { id: currentMatchId },
      data: {
        scoreHome:     state.homeScore,
        scoreAway:     state.awayScore,
        gameMode:      state.gameMode,
        phase:         state.phase,
        currentPeriod: String(state.currentPeriod),
        timeRemaining: state.timeRemaining,
        running:       false, // beim Speichern immer als gestoppt markieren
        penalties:     state.penalties,
      }
    });
  } catch (e) {
    console.error('State save failed:', e.message);
  }
}

// Alle 5 Sekunden speichern
setInterval(saveStateToDb, 5000);

// ─── Crash Recovery: Letzten State beim Start laden ──────────────────────────
async function loadLastMatch() {
  try {
    const match = await prisma.match.findFirst({
      where: { phase: { not: 'ended' } },
      orderBy: { savedAt: 'desc' },
      include: { homeTeam: true, awayTeam: true }
    });

    if (!match) return;

    console.log(`\n⚠️  Unbeendetes Spiel gefunden: ${match.homeTeam.name} vs ${match.awayTeam.name}`);
    console.log(`   Letzter Stand: ${match.scoreHome}:${match.scoreAway} | Phase: ${match.phase} | Zeit: ${Math.floor(match.timeRemaining)}s\n`);

    currentMatchId = match.id;
    state = {
      ...createInitialState(),
      homeTeam:      match.homeTeam.name,
      awayTeam:      match.awayTeam.name,
      homeScore:     match.scoreHome,
      awayScore:     match.scoreAway,
      gameMode:      match.gameMode,
      phase:         match.phase,
      currentPeriod: isNaN(match.currentPeriod) ? match.currentPeriod : parseInt(match.currentPeriod),
      timeRemaining: match.timeRemaining,
      running:       false,
      penalties:     Array.isArray(match.penalties) ? match.penalties : [],
      periodDuration: match.gameMode === '1x24' ? 24 * 60 : 20 * 60,
    };

  } catch (e) {
    console.error('loadLastMatch failed:', e.message);
  }
}

// ─── Server-side clock tick (every 100ms) ────────────────────────────────────
let tickInterval = null;

function startTick() {
  if (tickInterval) return;
  tickInterval = setInterval(() => {
    const now = Date.now();
    const elapsed = state.lastTick ? (now - state.lastTick) / 1000 : 0;

    // Timeout läuft immer (unabhängig von running)
    if (state.timeoutActive) {
      state.lastTick = now;
      state.timeoutRemaining = Math.max(0, state.timeoutRemaining - elapsed);
      if (state.timeoutRemaining <= 0) {
        state.timeoutActive = null;
        state.timeoutRemaining = 30;
        broadcast({ type: 'BUZZER', reason: 'timeout' });
      }
      broadcast({ type: 'STATE', state });
      return;
    }

    // Spielzeit gestoppt
    if (!state.running) {
      state.lastTick = null;
      return;
    }

    // Spielzeit läuft
    state.lastTick = now;

    state.penalties = state.penalties.map(p => {
      const rem = Math.max(0, p.remaining - elapsed);
      if (rem <= 0 && p.remaining > 0) broadcast({ type: 'BUZZER', reason: 'penalty', id: p.id });
      return { ...p, remaining: rem };
    }).filter(p => p.remaining > 0);

    state.timeRemaining = Math.max(0, state.timeRemaining - elapsed);
    if (state.timeRemaining <= 0 && state.running) {
      state.running = false;
      state.lastTick = null;
      broadcast({ type: 'BUZZER', reason: 'period' });
    }

    broadcast({ type: 'STATE', state });
  }, 100);
}

// ─── WebSocket ────────────────────────────────────────────────────────────────
function broadcast(msg) {
  const data = JSON.stringify(msg);
  wss.clients.forEach(c => { if (c.readyState === WebSocket.OPEN) c.send(data); });
}

wss.on('connection', ws => {
  ws.send(JSON.stringify({ type: 'STATE', state }));
  ws.on('message', raw => {
    try { handleCommand(JSON.parse(raw)); }
    catch (e) { console.error('Invalid message:', e); }
  });
});

async function handleCommand(msg) {
  switch (msg.cmd) {
    case 'SET_CONFIG': {
      state.gameMode     = msg.gameMode;
      state.breakDuration = msg.breakDuration;
      state.otDuration   = msg.otDuration;
      state.homeTeam     = msg.homeTeam;
      state.awayTeam     = msg.awayTeam;
      state.periodDuration = msg.gameMode === '1x24' ? 24 * 60 : 20 * 60;
      state.timeRemaining = state.periodDuration;
      state.phase        = 'pregame';
      state.currentPeriod = 1;

      // Match in DB anlegen (oder neues erstellen wenn keins aktiv)
      try {
        // Altes unbeendetes Match als ended markieren
        if (currentMatchId) {
          await prisma.match.update({ where: { id: currentMatchId }, data: { phase: 'ended' } });
        }

        // Teams in DB suchen oder Freitext-Fallback
        const homeTeamDb = await prisma.team.findFirst({ where: { OR: [{ name: msg.homeTeam }, { abbreviation: msg.homeTeam }] } });
        const awayTeamDb = await prisma.team.findFirst({ where: { OR: [{ name: msg.awayTeam }, { abbreviation: msg.awayTeam }] } });

        // Falls Team nicht in DB: temporär anlegen
        const homeTeam = homeTeamDb || await prisma.team.create({ data: { name: msg.homeTeam, abbreviation: msg.homeTeam, color: '#00d4ff', organization: '' } });
        const awayTeam = awayTeamDb || await prisma.team.create({ data: { name: msg.awayTeam, abbreviation: msg.awayTeam, color: '#ff6b6b', organization: '' } });

        const match = await prisma.match.create({
          data: {
            homeTeamId:    homeTeam.id,
            awayTeamId:    awayTeam.id,
            gameMode:      msg.gameMode,
            phase:         'pregame',
            currentPeriod: '1',
            timeRemaining: state.periodDuration,
            running:       false,
            penalties:     [],
          }
        });
        currentMatchId = match.id;
        console.log(`✅ Match #${currentMatchId} erstellt: ${msg.homeTeam} vs ${msg.awayTeam}`);
      } catch (e) {
        console.error('Match create failed:', e.message);
      }
      break;
    }
    case 'START':
      if (!state.running && state.phase !== 'ended') {
        state.running = true;
        state.lastTick = Date.now();
        if (state.phase === 'pregame') state.phase = 'period';

        // startedAt beim ersten Start setzen
        if (currentMatchId) {
          try {
            const match = await prisma.match.findUnique({ where: { id: currentMatchId } });
            if (!match.startedAt) {
              await prisma.match.update({ where: { id: currentMatchId }, data: { startedAt: new Date(), phase: 'period' } });
            }
          } catch (e) { console.error('startedAt update failed:', e.message); }
        }
      }
      break;
    case 'STOP':
      state.running = false;
      state.lastTick = null;
      await saveStateToDb(); // sofort speichern beim Stop
      break;
    case 'NEXT_PHASE':
      advancePhase();
      await saveStateToDb();
      break;
    case 'RESET':
      if (currentMatchId) {
        try { await prisma.match.update({ where: { id: currentMatchId }, data: { phase: 'ended' } }); } catch (e) {}
      }
      currentMatchId = null;
      state = createInitialState();
      break;
    case 'GOAL_HOME': state.homeScore++; break;
    case 'GOAL_AWAY': state.awayScore++; break;
    case 'UNDO_HOME': state.homeScore = Math.max(0, state.homeScore - 1); break;
    case 'UNDO_AWAY': state.awayScore = Math.max(0, state.awayScore - 1); break;
    case 'SO_HOME': state.homeShootout++; break;
    case 'SO_AWAY': state.awayShootout++; break;
    case 'ADD_PENALTY':
      state.penalties.push({ id: Date.now(), team: msg.team, player: msg.player || '', duration: msg.duration * 60, remaining: msg.duration * 60 });
      break;
    case 'REMOVE_PENALTY':
      state.penalties = state.penalties.filter(p => p.id !== msg.id);
      break;
    case 'TIMEOUT':
      if (msg.team === 'home' && state.homeTimeouts > 0) {
        state.homeTimeouts--; state.timeoutActive = 'home'; state.timeoutRemaining = 30; state.running = false;
      } else if (msg.team === 'away' && state.awayTimeouts > 0) {
        state.awayTimeouts--; state.timeoutActive = 'away'; state.timeoutRemaining = 30; state.running = false;
      }
      break;
    case 'ADJUST_TIME': {
      const delta = msg.delta;
      state.timeRemaining = Math.max(0, state.timeRemaining + delta);
      state.penalties = state.penalties.map(p => ({
        ...p,
        remaining: Math.max(0, p.remaining + delta)
      }));
      break;
    }
  }
  broadcast({ type: 'STATE', state });
}

function advancePhase() {
  state.running = false;
  state.lastTick = null;
  state.penalties = [];
  const periods = state.gameMode === '3x20' ? 3 : state.gameMode === '2x20' ? 2 : 1;
  if (state.phase === 'pregame') {
    state.phase = 'period'; state.currentPeriod = 1; state.timeRemaining = state.periodDuration;
  } else if (state.phase === 'period') {
    if (state.currentPeriod < periods) {
      state.phase = 'break'; state.timeRemaining = state.breakDuration;
    } else {
      state.phase = 'break'; state.timeRemaining = state.breakDuration; state.currentPeriod = 'OT_PENDING';
    }
  } else if (state.phase === 'break') {
    if (state.currentPeriod === 'OT_PENDING') {
      state.phase = 'overtime'; state.currentPeriod = 'OT'; state.timeRemaining = state.otDuration;
    } else {
      state.phase = 'period'; state.currentPeriod++; state.timeRemaining = state.periodDuration;
    }
  } else if (state.phase === 'overtime') {
    state.phase = 'shootout'; state.currentPeriod = 'SO'; state.timeRemaining = 0;
  } else if (state.phase === 'shootout') {
    state.phase = 'ended';
    if (currentMatchId) {
      prisma.match.update({ where: { id: currentMatchId }, data: { phase: 'ended', scoreHome: state.homeScore, scoreAway: state.awayScore } }).catch(e => console.error(e.message));
    }
  }
}

// ─── Server start ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
server.listen(PORT, async () => {
  console.log('\n🏒 Unihockey Matchuhr läuft!');
  console.log(`   Spielstart:   http://localhost:${PORT}/gamestart.html`);
  console.log(`   Operator:     http://localhost:${PORT}/operator.html`);
  console.log(`   Display:      http://localhost:${PORT}/display.html`);
  console.log(`   Manager:      http://localhost:${PORT}/manager.html`);
  console.log(`\n   Prisma Studio: npx prisma studio  →  http://localhost:5555\n`);

  await loadLastMatch();
  startTick();
});