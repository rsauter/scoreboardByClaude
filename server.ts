import 'dotenv/config';
import { PrismaClient } from './generated/prisma';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import express from 'express';
import http from 'http';
import WebSocket, { WebSocketServer } from 'ws';
import path from 'path';
import type { GameState, GameMode, Penalty, ClientCommand, ServerMessage } from './src/shared/types';

const pool    = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma  = new PrismaClient({ adapter });

const app    = express();
const server = http.createServer(app);
const wss    = new WebSocketServer({ server });

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// ─── Teams API ────────────────────────────────────────────────────────────────
app.get('/api/teams', async (_req, res) => {
  try {
    const teams = await prisma.team.findMany({ orderBy: { name: 'asc' } });
    res.json(teams);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.post('/api/teams', async (req, res) => {
  const { name, abbreviation, color, organization } = req.body;
  if (!name) return void res.status(400).json({ error: 'Name ist pflicht' });
  try {
    const team = await prisma.team.create({ data: { name, abbreviation: abbreviation || '', color: color || '#00d4ff', organization: organization || '' } });
    res.status(201).json(team);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.put('/api/teams/:id', async (req, res) => {
  const { name, abbreviation, color, organization } = req.body;
  if (!name) return void res.status(400).json({ error: 'Name ist pflicht' });
  try {
    const team = await prisma.team.update({ where: { id: parseInt(req.params.id) }, data: { name, abbreviation: abbreviation || '', color: color || '#00d4ff', organization: organization || '' } });
    res.json(team);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/teams/:id', async (req, res) => {
  try {
    await prisma.team.delete({ where: { id: parseInt(req.params.id) } });
    res.status(204).send();
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

function isValidGameMode(mode: unknown): mode is GameMode {
  return mode === '1x24' || mode === '2x20' || mode === '3x20';
}

function getPeriodDuration(mode: GameMode): number {
  return mode === '1x24' ? 24 * 60 : 20 * 60;
}

// ─── Matches API (nur geplante Matches) ─────────────────────────────────────
app.get('/api/matches', async (_req, res) => {
  try {
    const matches = await prisma.match.findMany({
      where: { phase: 'planned' },
      orderBy: { scheduledAt: 'desc' },
      include: { homeTeam: true, awayTeam: true }
    });
    res.json(matches);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.post('/api/matches', async (req, res) => {
  const { homeTeamId, awayTeamId, gameMode, scheduledAt } = req.body;
  if (!homeTeamId || !awayTeamId) {
    return void res.status(400).json({ error: 'homeTeamId und awayTeamId sind Pflicht' });
  }
  if (homeTeamId === awayTeamId) {
    return void res.status(400).json({ error: 'Heim und Gast müssen unterschiedlich sein' });
  }
  if (!isValidGameMode(gameMode)) {
    return void res.status(400).json({ error: 'Ungültiger gameMode' });
  }

  let scheduledAtDate: Date | null = null;
  if (!scheduledAt) {
    return void res.status(400).json({ error: 'scheduledAt ist Pflicht' });
  }
  scheduledAtDate = new Date(scheduledAt);
  if (Number.isNaN(scheduledAtDate.getTime())) {
    return void res.status(400).json({ error: 'Ungültiges Datum für scheduledAt' });
  }

  try {
    const match = await prisma.match.create({
      data: {
        homeTeamId: Number(homeTeamId),
        awayTeamId: Number(awayTeamId),
        gameMode,
        scheduledAt: scheduledAtDate,
        phase: 'planned',
        currentPeriod: '1',
        timeRemaining: getPeriodDuration(gameMode),
        running: false,
        penalties: [],
      },
      include: { homeTeam: true, awayTeam: true }
    });
    res.status(201).json(match);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.put('/api/matches/:id', async (req, res) => {
  const { homeTeamId, awayTeamId, gameMode, scheduledAt } = req.body;
  if (!homeTeamId || !awayTeamId) {
    return void res.status(400).json({ error: 'homeTeamId und awayTeamId sind Pflicht' });
  }
  if (homeTeamId === awayTeamId) {
    return void res.status(400).json({ error: 'Heim und Gast müssen unterschiedlich sein' });
  }
  if (!isValidGameMode(gameMode)) {
    return void res.status(400).json({ error: 'Ungültiger gameMode' });
  }

  if (!scheduledAt) {
    return void res.status(400).json({ error: 'scheduledAt ist Pflicht' });
  }
  const scheduledAtDate = new Date(scheduledAt);
  if (Number.isNaN(scheduledAtDate.getTime())) {
    return void res.status(400).json({ error: 'Ungültiges Datum für scheduledAt' });
  }

  try {
    const updated = await prisma.match.updateMany({
      where: { id: parseInt(req.params.id), phase: 'planned' },
      data: {
        homeTeamId: Number(homeTeamId),
        awayTeamId: Number(awayTeamId),
        gameMode,
        scheduledAt: scheduledAtDate,
        currentPeriod: '1',
        timeRemaining: getPeriodDuration(gameMode),
      }
    });

    if (updated.count === 0) {
      return void res.status(404).json({ error: 'Geplantes Match nicht gefunden' });
    }

    const match = await prisma.match.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { homeTeam: true, awayTeam: true }
    });
    res.json(match);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/matches/:id', async (req, res) => {
  try {
    const deleted = await prisma.match.deleteMany({ where: { id: parseInt(req.params.id), phase: 'planned' } });
    if (deleted.count === 0) {
      return void res.status(404).json({ error: 'Geplantes Match nicht gefunden' });
    }
    res.status(204).send();
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ─── Health ───────────────────────────────────────────────────────────────────
app.get('/api/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ db: 'ok' });
  } catch {
    res.json({ db: 'error' });
  }
});

// ─── Game State ───────────────────────────────────────────────────────────────
let state: GameState = createInitialState();
let currentMatchId: number | null = null;

function createInitialState(): GameState {
  return {
    gameMode:        '3x20',
    periodDuration:  20 * 60,
    breakDuration:   10 * 60,
    otDuration:       5 * 60,
    homeTeam:        'Heim',
    awayTeam:        'Gast',
    homeScore:       0,
    awayScore:       0,
    phase:           'pregame',
    currentPeriod:   1,
    timeRemaining:   20 * 60,
    running:         false,
    penalties:       [],
    homeTimeouts:    1,
    awayTimeouts:    1,
    timeoutActive:   null,
    timeoutRemaining: 30,
    homeShootout:    0,
    awayShootout:    0,
    lastTick:        null,
  };
}

// ─── Crash Recovery ───────────────────────────────────────────────────────────
async function saveStateToDb(): Promise<void> {
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
        running:       false,
        penalties:     state.penalties as any,
      }
    });
  } catch (e: any) {
    console.error('State save failed:', e.message);
  }
}

setInterval(saveStateToDb, 5000);

async function loadLastMatch(): Promise<void> {
  try {
    const match = await prisma.match.findFirst({
      where: { phase: { notIn: ['ended', 'planned'] } },
      orderBy: { savedAt: 'desc' },
      include: { homeTeam: true, awayTeam: true }
    });
    if (!match) return;

    console.log(`\n⚠️  Unbeendetes Spiel gefunden: ${match.homeTeam.name} vs ${match.awayTeam.name}`);
    console.log(`   Letzter Stand: ${match.scoreHome}:${match.scoreAway} | Phase: ${match.phase} | Zeit: ${Math.floor(match.timeRemaining)}s\n`);

    currentMatchId = match.id;
    state = {
      ...createInitialState(),
      homeTeam:       match.homeTeam.name,
      awayTeam:       match.awayTeam.name,
      homeScore:      match.scoreHome,
      awayScore:      match.scoreAway,
      gameMode:       match.gameMode as GameMode,
      phase:          match.phase as GameState['phase'],
      currentPeriod:  isNaN(Number(match.currentPeriod)) ? (match.currentPeriod as GameState['currentPeriod']) : parseInt(match.currentPeriod),
      timeRemaining:  match.timeRemaining,
      running:        false,
      penalties: Array.isArray(match.penalties) ? match.penalties as unknown as Penalty[] : [],
      periodDuration: getPeriodDuration(match.gameMode as GameMode),
    };
  } catch (e: any) {
    console.error('loadLastMatch failed:', e.message);
  }
}

// ─── Tick ─────────────────────────────────────────────────────────────────────
let tickInterval: ReturnType<typeof setInterval> | null = null;

function startTick(): void {
  if (tickInterval) return;
  tickInterval = setInterval(() => {
    const now     = Date.now();
    const elapsed = state.lastTick ? (now - state.lastTick) / 1000 : 0;

    if (state.timeoutActive) {
      state.lastTick        = now;
      state.timeoutRemaining = Math.max(0, state.timeoutRemaining - elapsed);
      if (state.timeoutRemaining <= 0) {
        state.timeoutActive   = null;
        state.timeoutRemaining = 30;
        broadcast({ type: 'BUZZER', reason: 'timeout' });
      }
      broadcast({ type: 'STATE', state });
      return;
    }

    if (!state.running) { state.lastTick = null; return; }

    state.lastTick = now;
    state.penalties = state.penalties.map(p => {
      const rem = Math.max(0, p.remaining - elapsed);
      if (rem <= 0 && p.remaining > 0) broadcast({ type: 'BUZZER', reason: 'penalty', id: p.id });
      return { ...p, remaining: rem };
    }).filter(p => p.remaining > 0);

    state.timeRemaining = Math.max(0, state.timeRemaining - elapsed);
    if (state.timeRemaining <= 0 && state.running) {
      state.running   = false;
      state.lastTick  = null;
      broadcast({ type: 'BUZZER', reason: 'period' });
    }

    broadcast({ type: 'STATE', state });
  }, 100);
}

// ─── WebSocket ────────────────────────────────────────────────────────────────
function broadcast(msg: ServerMessage): void {
  const data = JSON.stringify(msg);
  wss.clients.forEach(c => { if (c.readyState === WebSocket.OPEN) c.send(data); });
}

wss.on('connection', ws => {
  ws.send(JSON.stringify({ type: 'STATE', state }));
  ws.on('message', raw => {
    try { handleCommand(JSON.parse(raw.toString()) as ClientCommand); }
    catch (e) { console.error('Invalid message:', e); }
  });
});

async function handleCommand(msg: ClientCommand): Promise<void> {
  switch (msg.cmd) {
    case 'SET_CONFIG': {
      state.gameMode      = msg.gameMode;
      state.breakDuration = msg.breakDuration;
      state.otDuration    = msg.otDuration;
      state.homeTeam      = msg.homeTeam;
      state.awayTeam      = msg.awayTeam;
      state.periodDuration = getPeriodDuration(msg.gameMode);
      state.timeRemaining  = state.periodDuration;
      state.phase          = 'pregame';
      state.currentPeriod  = 1;
      try {
        if (currentMatchId && currentMatchId !== msg.matchId) {
          await prisma.match.update({ where: { id: currentMatchId }, data: { phase: 'ended' } });
        }

        const homeTeamDb = await prisma.team.findFirst({ where: { OR: [{ name: msg.homeTeam }, { abbreviation: msg.homeTeam }] } });
        const awayTeamDb = await prisma.team.findFirst({ where: { OR: [{ name: msg.awayTeam }, { abbreviation: msg.awayTeam }] } });
        const homeTeam   = homeTeamDb || await prisma.team.create({ data: { name: msg.homeTeam, abbreviation: msg.homeTeam, color: '#00d4ff', organization: '' } });
        const awayTeam   = awayTeamDb || await prisma.team.create({ data: { name: msg.awayTeam, abbreviation: msg.awayTeam, color: '#ff6b6b', organization: '' } });

        if (msg.matchId) {
          const updated = await prisma.match.updateMany({
            where: { id: msg.matchId, phase: 'planned' },
            data: {
              homeTeamId: homeTeam.id,
              awayTeamId: awayTeam.id,
              gameMode: msg.gameMode,
              phase: 'pregame',
              currentPeriod: '1',
              timeRemaining: state.periodDuration,
              running: false,
              penalties: [],
              scoreHome: 0,
              scoreAway: 0,
              startedAt: null,
            }
          });

          if (updated.count > 0) {
            currentMatchId = msg.matchId;
            console.log(`✅ Geplantes Match #${currentMatchId} aktiviert: ${msg.homeTeam} vs ${msg.awayTeam}`);
          } else {
            const match = await prisma.match.create({
              data: { homeTeamId: homeTeam.id, awayTeamId: awayTeam.id, gameMode: msg.gameMode, phase: 'pregame', currentPeriod: '1', timeRemaining: state.periodDuration, running: false, penalties: [] }
            });
            currentMatchId = match.id;
            console.log(`✅ Match #${currentMatchId} erstellt (Fallback): ${msg.homeTeam} vs ${msg.awayTeam}`);
          }
        } else {
          const match = await prisma.match.create({
            data: { homeTeamId: homeTeam.id, awayTeamId: awayTeam.id, gameMode: msg.gameMode, phase: 'pregame', currentPeriod: '1', timeRemaining: state.periodDuration, running: false, penalties: [] }
          });
          currentMatchId = match.id;
          console.log(`✅ Match #${currentMatchId} erstellt: ${msg.homeTeam} vs ${msg.awayTeam}`);
        }
      } catch (e: any) { console.error('Match create failed:', e.message); }
      break;
    }
    case 'START':
      if (!state.running && state.phase !== 'ended') {
        state.running  = true;
        state.lastTick = Date.now();
        if (state.phase === 'pregame') state.phase = 'period';
        if (currentMatchId) {
          try {
            const match = await prisma.match.findUnique({ where: { id: currentMatchId } });
            if (match && !match.startedAt) {
              const now = new Date();
              await prisma.match.update({ where: { id: currentMatchId }, data: { startedAt: now, playedAt: now, phase: 'period' } });
            }
          } catch (e: any) { console.error('startedAt update failed:', e.message); }
        }
      }
      break;
    case 'STOP':
      state.running  = false;
      state.lastTick = null;
      await saveStateToDb();
      break;
    case 'NEXT_PHASE':
      advancePhase();
      await saveStateToDb();
      break;
    case 'RESET':
      if (currentMatchId) {
        try { await prisma.match.update({ where: { id: currentMatchId }, data: { phase: 'ended' } }); } catch { }
      }
      currentMatchId = null;
      state = createInitialState();
      break;
    case 'GOAL_HOME':  state.homeScore++; break;
    case 'GOAL_AWAY':  state.awayScore++; break;
    case 'UNDO_HOME':  state.homeScore = Math.max(0, state.homeScore - 1); break;
    case 'UNDO_AWAY':  state.awayScore = Math.max(0, state.awayScore - 1); break;
    case 'SO_HOME':    state.homeShootout++; break;
    case 'SO_AWAY':    state.awayShootout++; break;
    case 'ADD_PENALTY':
      state.penalties.push({ id: Date.now(), team: msg.team, player: msg.player, duration: msg.duration * 60, remaining: msg.duration * 60 });
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
      state.penalties = state.penalties.map(p => ({ ...p, remaining: Math.max(0, p.remaining + delta) }));
      break;
    }
  }
  broadcast({ type: 'STATE', state });
}

function advancePhase(): void {
  state.running     = false;
  state.lastTick    = null;
  state.penalties   = [];
  const periods = state.gameMode === '3x20' ? 3 : state.gameMode === '2x20' ? 2 : 1;
  if (state.phase === 'pregame') {
    state.phase = 'period'; state.currentPeriod = 1; state.timeRemaining = state.periodDuration;
  } else if (state.phase === 'period') {
    if (typeof state.currentPeriod === 'number' && state.currentPeriod < periods) {
      state.phase = 'break'; state.timeRemaining = state.breakDuration;
    } else {
      state.phase = 'break'; state.timeRemaining = state.breakDuration; state.currentPeriod = 'OT_PENDING';
    }
  } else if (state.phase === 'break') {
    if (state.currentPeriod === 'OT_PENDING') {
      state.phase = 'overtime'; state.currentPeriod = 'OT'; state.timeRemaining = state.otDuration;
    } else {
      state.phase = 'period'; state.currentPeriod = (state.currentPeriod as number) + 1; state.timeRemaining = state.periodDuration;
    }
  } else if (state.phase === 'overtime') {
    state.phase = 'shootout'; state.currentPeriod = 'SO'; state.timeRemaining = 0;
  } else if (state.phase === 'shootout') {
    state.phase = 'ended';
    if (currentMatchId) {
      prisma.match.update({ where: { id: currentMatchId }, data: { phase: 'ended', scoreHome: state.homeScore, scoreAway: state.awayScore } }).catch((e: any) => console.error(e.message));
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
  console.log(`\n   Prisma Studio: npx prisma studio  →  http://localhost:5555  (start manual)\n`);
  await loadLastMatch();
  startTick();
});