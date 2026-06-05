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

startTick();

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

function handleCommand(msg) {
  switch (msg.cmd) {
    case 'SET_CONFIG':
      state.gameMode = msg.gameMode;
      state.breakDuration = msg.breakDuration;
      state.otDuration = msg.otDuration;
      state.homeTeam = msg.homeTeam;
      state.awayTeam = msg.awayTeam;
      state.periodDuration = msg.gameMode === '1x24' ? 24 * 60 : 20 * 60;
      state.timeRemaining = state.periodDuration;
      state.phase = 'pregame';
      state.currentPeriod = 1;
      break;
    case 'START':
      if (!state.running && state.phase !== 'ended') {
        state.running = true;
        state.lastTick = Date.now();
        if (state.phase === 'pregame') state.phase = 'period';
      }
      break;
    case 'STOP':
      state.running = false;
      state.lastTick = null;
      break;
    case 'NEXT_PHASE': advancePhase(); break;
    case 'RESET': state = createInitialState(); break;
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
      const delta = msg.delta; // positiv = vorwärts, negativ = rückwärts
      state.timeRemaining = Math.max(0, state.timeRemaining + delta);
      // Alle aktiven Strafen um denselben Delta anpassen (nicht Timeout!)
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
  }
}

// ─── TODO: PostgreSQL ─────────────────────────────────────────────────────────
// Hier später anbinden: pg / Prisma
// ─────────────────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log('\n🏒 Unihockey Matchuhr läuft!');
  console.log(`   Operator:     http://localhost:${PORT}/gamestart.html`);
  console.log(`   Display:      http://localhost:${PORT}/display.html\n`);
  console.log(`   Manage Teams: http://localhost:${PORT}/manager.html\n`);
  console.log(`\n   Prisma Studio: npx prisma studio  →  http://localhost:5555\n`);

});