#!/usr/bin/env node
/**
 * setup.js – Unihockey Matchuhr MVP
 * Ausführen mit: node setup.js
 * Erstellt die komplette Projektstruktur im aktuellen Verzeichnis.
 */

const fs = require('fs');
const path = require('path');

const files = {
  'package.json': `{
  "name": "unihockey-matchuhr",
  "version": "1.0.0",
  "description": "Unihockey Spieluhr MVP",
  "main": "server.js",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "ws": "^8.16.0"
  }
}`,

  'server.js': `const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static(path.join(__dirname, 'public')));

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

    if (state.timeoutActive) {
      const elapsed = state.lastTick ? (now - state.lastTick) / 1000 : 0;
      state.lastTick = now;
      state.timeoutRemaining = Math.max(0, state.timeoutRemaining - elapsed);
      if (state.timeoutRemaining <= 0) {
        state.timeoutActive = null;
        state.timeoutRemaining = 30;
        broadcast({ type: 'BUZZER', reason: 'timeout' });
      }
    }

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
      state.penalties.push({ id: Date.now(), team: msg.team, player: msg.player || '', duration: msg.duration, remaining: msg.duration });
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
  console.log('\\n🏒 Unihockey Matchuhr läuft!');
  console.log(\`   Operator: http://localhost:\${PORT}/operator.html\`);
  console.log(\`   Display:  http://localhost:\${PORT}/display.html\\n\`);
});`,

  'public/operator.html': `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Matchuhr – Operator</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #1a1a2e; color: #eee; font-family: 'Segoe UI', sans-serif; padding: 16px; }
  h1 { text-align: center; color: #00d4ff; margin-bottom: 16px; font-size: 1.4rem; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .card { background: #16213e; border-radius: 10px; padding: 14px; }
  .card h2 { font-size: 0.85rem; color: #aaa; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 1px; }
  .clock-display { text-align: center; font-size: 3.5rem; font-weight: bold; color: #00d4ff; font-variant-numeric: tabular-nums; }
  .phase-display { text-align: center; font-size: 1rem; color: #aaa; margin: 4px 0 10px; }
  .btn { padding: 10px 16px; border: none; border-radius: 6px; cursor: pointer; font-size: 0.9rem; font-weight: bold; transition: opacity 0.2s; }
  .btn:hover { opacity: 0.85; } .btn:active { opacity: 0.7; }
  .btn-green { background: #00b894; color: #fff; } .btn-red { background: #d63031; color: #fff; }
  .btn-blue { background: #0984e3; color: #fff; } .btn-orange { background: #e17055; color: #fff; }
  .btn-gray { background: #636e72; color: #fff; } .btn-yellow { background: #fdcb6e; color: #1a1a2e; }
  .btn-sm { padding: 6px 10px; font-size: 0.8rem; } .btn-xs { padding: 4px 8px; font-size: 0.75rem; }
  .row { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 8px; }
  .row-center { justify-content: center; }
  .score-box { display: flex; align-items: center; justify-content: space-around; }
  .score-team { text-align: center; }
  .score-team .name { font-size: 0.9rem; color: #aaa; }
  .score-team .goals { font-size: 3rem; font-weight: bold; color: #fff; }
  .penalty-list { list-style: none; }
  .penalty-list li { background: #0f3460; border-radius: 6px; padding: 6px 10px; margin-bottom: 6px; display: flex; justify-content: space-between; align-items: center; font-size: 0.85rem; }
  .pen-time { font-weight: bold; color: #ff7675; }
  select, input[type=text], input[type=number] { background: #0f3460; color: #eee; border: 1px solid #0984e3; border-radius: 6px; padding: 6px 8px; font-size: 0.85rem; width: 100%; }
  label { font-size: 0.8rem; color: #aaa; display: block; margin-bottom: 4px; }
  .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px; }
  .form-row-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-bottom: 8px; }
  .timeout-box { display: flex; justify-content: space-around; align-items: center; }
  .to-remaining { font-size: 1.8rem; font-weight: bold; color: #fdcb6e; text-align: center; }
  .status-bar { text-align: center; padding: 6px; background: #0f3460; border-radius: 6px; font-size: 0.8rem; color: #74b9ff; margin-bottom: 12px; }
  .full-width { grid-column: 1 / -1; }
  .shootout-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; text-align: center; }
  .so-score { font-size: 2rem; font-weight: bold; color: #fd79a8; }
</style>
</head>
<body>
<h1>⏱ Matchuhr – Operator</h1>
<div class="status-bar" id="conn-status">Verbinde...</div>
<div class="card full-width" style="margin-bottom:12px">
  <h2>Spielkonfiguration</h2>
  <div class="form-row">
    <div><label>Heim-Team</label><input type="text" id="cfg-home" value="Heim"></div>
    <div><label>Gast-Team</label><input type="text" id="cfg-away" value="Gast"></div>
  </div>
  <div class="form-row-3">
    <div><label>Spielmodus</label>
      <select id="cfg-mode">
        <option value="1x24">1 × 24 min (E-Junioren)</option>
        <option value="2x20">2 × 20 min (Halbzeiten)</option>
        <option value="3x20" selected>3 × 20 min (Dritteln)</option>
      </select>
    </div>
    <div><label>Pause</label>
      <select id="cfg-break">
        <option value="300">5 min</option>
        <option value="600" selected>10 min</option>
        <option value="900">15 min</option>
      </select>
    </div>
    <div><label>Verlängerung</label>
      <select id="cfg-ot">
        <option value="300" selected>5 min Sudden Death</option>
        <option value="600">10 min Sudden Death</option>
      </select>
    </div>
  </div>
  <button class="btn btn-blue" onclick="applyConfig()">✅ Konfiguration übernehmen</button>
</div>
<div class="grid">
  <div class="card full-width">
    <h2>Spielzeit</h2>
    <div class="clock-display" id="clock">20:00</div>
    <div class="phase-display" id="phase-label">–</div>
    <div class="row row-center">
      <button class="btn btn-green" onclick="send('START')">▶ Start</button>
      <button class="btn btn-red" onclick="send('STOP')">⏸ Stop</button>
      <button class="btn btn-orange" onclick="send('NEXT_PHASE')">⏭ Nächste Phase</button>
      <button class="btn btn-gray btn-sm" onclick="confirmReset()">🔄 Reset</button>
    </div>
  </div>
  <div class="card">
    <h2>Spielstand</h2>
    <div class="score-box">
      <div class="score-team">
        <div class="name" id="op-home-name">Heim</div>
        <div class="goals" id="op-home-score">0</div>
        <div class="row"><button class="btn btn-green btn-sm" onclick="send('GOAL_HOME')">+1</button><button class="btn btn-gray btn-sm" onclick="send('UNDO_HOME')">−1</button></div>
      </div>
      <div style="font-size:2rem;color:#aaa">:</div>
      <div class="score-team">
        <div class="name" id="op-away-name">Gast</div>
        <div class="goals" id="op-away-score">0</div>
        <div class="row"><button class="btn btn-green btn-sm" onclick="send('GOAL_AWAY')">+1</button><button class="btn btn-gray btn-sm" onclick="send('UNDO_AWAY')">−1</button></div>
      </div>
    </div>
  </div>
  <div class="card">
    <h2>Timeout (30 Sek.)</h2>
    <div class="timeout-box">
      <div style="text-align:center">
        <div id="to-home-name">Heim</div>
        <button class="btn btn-yellow btn-sm" id="btn-to-home" onclick="send('TIMEOUT',{team:'home'})">TO Heim</button>
        <div style="font-size:0.75rem;color:#aaa;margin-top:4px" id="to-home-left"></div>
      </div>
      <div class="to-remaining" id="to-remaining" style="display:none">0:30</div>
      <div style="text-align:center">
        <div id="to-away-name">Gast</div>
        <button class="btn btn-yellow btn-sm" id="btn-to-away" onclick="send('TIMEOUT',{team:'away'})">TO Gast</button>
        <div style="font-size:0.75rem;color:#aaa;margin-top:4px" id="to-away-left"></div>
      </div>
    </div>
  </div>
  <div class="card full-width">
    <h2>Strafen</h2>
    <div class="form-row-3" style="margin-bottom:8px">
      <div><label>Team</label><select id="pen-team"><option value="home">Heim</option><option value="away">Gast</option></select></div>
      <div><label>Spieler #</label><input type="text" id="pen-player" placeholder="z.B. 7"></div>
      <div><label>Dauer</label><select id="pen-duration"><option value="2">2 min</option><option value="5">5 min</option><option value="10">10 min</option></select></div>
    </div>
    <button class="btn btn-red btn-sm" onclick="addPenalty()">➕ Strafe erfassen</button>
    <ul class="penalty-list" id="penalty-list" style="margin-top:10px"></ul>
  </div>
  <div class="card full-width" id="shootout-card" style="display:none">
    <h2>Penalty / Shootout</h2>
    <div class="shootout-grid">
      <div><div id="so-home-name">Heim</div><div class="so-score" id="so-home-score">0</div><button class="btn btn-green btn-sm" onclick="send('SO_HOME')">Tor ✓</button></div>
      <div><div id="so-away-name">Gast</div><div class="so-score" id="so-away-score">0</div><button class="btn btn-green btn-sm" onclick="send('SO_AWAY')">Tor ✓</button></div>
    </div>
  </div>
</div>
<script>
  const ws = new WebSocket(\`ws://\${location.host}\`);
  let st = {};
  ws.onopen = () => document.getElementById('conn-status').textContent = '🟢 Verbunden';
  ws.onclose = () => document.getElementById('conn-status').textContent = '🔴 Getrennt – Seite neu laden';
  ws.onmessage = e => { const m = JSON.parse(e.data); if (m.type==='STATE'){st=m.state;render(st);} if(m.type==='BUZZER')playBuzzer(m.reason); };
  function send(cmd,extra={}){ ws.send(JSON.stringify({cmd,...extra})); }
  function applyConfig(){ send('SET_CONFIG',{gameMode:document.getElementById('cfg-mode').value,breakDuration:parseInt(document.getElementById('cfg-break').value),otDuration:parseInt(document.getElementById('cfg-ot').value),homeTeam:document.getElementById('cfg-home').value||'Heim',awayTeam:document.getElementById('cfg-away').value||'Gast'}); }
  function addPenalty(){ send('ADD_PENALTY',{team:document.getElementById('pen-team').value,player:document.getElementById('pen-player').value,duration:parseInt(document.getElementById('pen-duration').value)}); document.getElementById('pen-player').value=''; }
  function confirmReset(){ if(confirm('Spiel wirklich zurücksetzen?'))send('RESET'); }
  function fmt(s){ const c=Math.ceil(s); return \`\${Math.floor(c/60)}:\${String(c%60).padStart(2,'0')}\`; }
  function phaseLabel(s){ const map={pregame:'Vor dem Spiel',break:'Pause',overtime:'Verlängerung (Sudden Death)',shootout:'Penalty / Shootout',ended:'Spiel beendet'}; if(map[s.phase])return map[s.phase]; const p=s.currentPeriod; if(s.gameMode==='2x20')return p===1?'1. Halbzeit':'2. Halbzeit'; return \`\${p}. Drittel\`; }
  function render(s){
    document.getElementById('clock').textContent=fmt(s.timeRemaining);
    document.getElementById('phase-label').textContent=phaseLabel(s);
    document.getElementById('op-home-name').textContent=s.homeTeam;
    document.getElementById('op-away-name').textContent=s.awayTeam;
    document.getElementById('op-home-score').textContent=s.homeScore;
    document.getElementById('op-away-score').textContent=s.awayScore;
    document.getElementById('to-home-name').textContent=s.homeTeam;
    document.getElementById('to-away-name').textContent=s.awayTeam;
    document.getElementById('to-home-left').textContent=\`TO verfügbar: \${s.homeTimeouts}\`;
    document.getElementById('to-away-left').textContent=\`TO verfügbar: \${s.awayTimeouts}\`;
    document.getElementById('btn-to-home').disabled=s.homeTimeouts===0||!!s.timeoutActive;
    document.getElementById('btn-to-away').disabled=s.awayTimeouts===0||!!s.timeoutActive;
    const toEl=document.getElementById('to-remaining');
    if(s.timeoutActive){toEl.style.display='block';toEl.textContent=fmt(s.timeoutRemaining);}else{toEl.style.display='none';}
    document.getElementById('penalty-list').innerHTML=s.penalties.map(p=>\`<li><span>\${p.team==='home'?s.homeTeam:s.awayTeam} #\${p.player||'?'} – \${Math.floor(p.duration/60)} min</span><span class="pen-time">\${fmt(p.remaining)}</span><button class="btn btn-gray btn-xs" onclick="send('REMOVE_PENALTY',{id:\${p.id}})">✕</button></li>\`).join('');
    const soCard=document.getElementById('shootout-card');
    soCard.style.display=s.phase==='shootout'?'block':'none';
    document.getElementById('so-home-name').textContent=s.homeTeam;
    document.getElementById('so-away-name').textContent=s.awayTeam;
    document.getElementById('so-home-score').textContent=s.homeShootout;
    document.getElementById('so-away-score').textContent=s.awayShootout;
  }
  const ctx=new(window.AudioContext||window.webkitAudioContext)();
  function playBuzzer(reason){ const o=ctx.createOscillator(),g=ctx.createGain(); o.connect(g);g.connect(ctx.destination); if(reason==='period'){o.frequency.value=220;g.gain.value=0.8;}else if(reason==='timeout'){o.frequency.value=660;g.gain.value=0.5;}else{o.frequency.value=440;g.gain.value=0.4;} o.start(); g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+(reason==='period'?1.5:0.6)); o.stop(ctx.currentTime+(reason==='period'?1.5:0.6)); }
</script>
</body>
</html>`,

  'public/display.html': `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Matchuhr – Display</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #000; color: #fff; font-family: 'Segoe UI','Arial Black',sans-serif; height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center; overflow: hidden; user-select: none; }
  .phase { font-size: 3vw; color: #888; letter-spacing: 4px; text-transform: uppercase; margin-bottom: 1vh; }
  .scoreboard { display: flex; align-items: center; justify-content: center; gap: 4vw; width: 100%; }
  .team { text-align: center; flex: 1; }
  .team-name { font-size: 4vw; color: #aaa; font-weight: bold; text-transform: uppercase; margin-bottom: 1vh; }
  .team-score { font-size: 20vw; font-weight: 900; line-height: 1; }
  .home-score { color: #00d4ff; } .away-score { color: #ff6b6b; }
  .divider { font-size: 12vw; color: #555; font-weight: 900; }
  .clock { font-size: 12vw; font-weight: 900; color: #00d4ff; font-variant-numeric: tabular-nums; margin: 2vh 0; text-shadow: 0 0 40px rgba(0,212,255,0.5); }
  .clock.running { color: #00ff88; text-shadow: 0 0 40px rgba(0,255,136,0.4); }
  .clock.paused  { color: #fdcb6e; text-shadow: 0 0 40px rgba(253,203,110,0.4); }
  .clock.ended   { color: #ff6b6b; }
  .clock.break   { color: #a29bfe; }
  .penalties { display: flex; gap: 3vw; margin-top: 2vh; }
  .pen-side { min-width: 20vw; }
  .pen-title { font-size: 1.5vw; color: #888; text-transform: uppercase; margin-bottom: 1vh; text-align: center; }
  .pen-item { background: rgba(214,48,49,0.2); border: 1px solid #d63031; border-radius: 8px; padding: 0.8vh 1.5vw; margin-bottom: 0.8vh; display: flex; justify-content: space-between; font-size: 2.2vw; font-weight: bold; }
  .pen-item .pen-num { color: #fff; } .pen-item .pen-rem { color: #ff7675; }
  .timeout-banner { position: fixed; top: 0; left: 0; right: 0; background: rgba(253,203,110,0.15); border-bottom: 3px solid #fdcb6e; text-align: center; padding: 2vh; font-size: 4vw; font-weight: bold; color: #fdcb6e; display: none; }
  .shootout-row { display: flex; gap: 6vw; margin-top: 2vh; font-size: 4vw; font-weight: bold; }
  .so-box { text-align: center; color: #fd79a8; }
  .so-label { font-size: 1.5vw; color: #aaa; }
  .ended-banner { font-size: 5vw; font-weight: 900; color: #fdcb6e; text-align: center; animation: pulse 1.2s infinite; }
  @keyframes pulse { 0%,100%{opacity:1}50%{opacity:0.4} }
  .conn-dot { position: fixed; top: 10px; right: 14px; font-size: 1.2vw; color: #888; }
</style>
</head>
<body>
<div class="timeout-banner" id="to-banner"></div>
<div class="conn-dot" id="conn-dot">⚫</div>
<div class="phase" id="phase-label"></div>
<div class="scoreboard">
  <div class="team"><div class="team-name" id="home-name">HEIM</div><div class="team-score home-score" id="home-score">0</div></div>
  <div class="divider">:</div>
  <div class="team"><div class="team-name" id="away-name">GAST</div><div class="team-score away-score" id="away-score">0</div></div>
</div>
<div class="clock" id="clock">20:00</div>
<div class="penalties">
  <div class="pen-side"><div class="pen-title" id="pen-home-title">Strafen Heim</div><div id="pen-home-list"></div></div>
  <div class="pen-side"><div class="pen-title" id="pen-away-title">Strafen Gast</div><div id="pen-away-list"></div></div>
</div>
<div class="shootout-row" id="so-row" style="display:none">
  <div class="so-box"><div class="so-label" id="so-home-lbl">Heim</div><div id="so-home">0</div></div>
  <div class="so-box"><div class="so-label" id="so-away-lbl">Gast</div><div id="so-away">0</div></div>
</div>
<div class="ended-banner" id="ended-banner" style="display:none">SPIEL BEENDET</div>
<script>
  const ws=new WebSocket(\`ws://\${location.host}\`);
  const dot=document.getElementById('conn-dot');
  ws.onopen=()=>dot.textContent='🟢';
  ws.onclose=()=>dot.textContent='🔴';
  ws.onmessage=e=>{ const m=JSON.parse(e.data); if(m.type==='STATE')render(m.state); if(m.type==='BUZZER')playBuzzer(m.reason); };
  function fmt(s){ const c=Math.ceil(s); return \`\${Math.floor(c/60)}:\${String(c%60).padStart(2,'0')}\`; }
  function phaseLabel(s){ if(s.phase==='pregame')return'Vor dem Spiel'; if(s.phase==='break')return'Pause'; if(s.phase==='overtime')return'Verlängerung – Sudden Death'; if(s.phase==='shootout')return'Penalty / Shootout'; if(s.phase==='ended')return''; const p=s.currentPeriod; if(s.gameMode==='2x20')return p===1?'1. Halbzeit':'2. Halbzeit'; return \`\${p}. Drittel\`; }
  function render(s){
    document.getElementById('home-name').textContent=s.homeTeam.toUpperCase();
    document.getElementById('away-name').textContent=s.awayTeam.toUpperCase();
    document.getElementById('home-score').textContent=s.homeScore;
    document.getElementById('away-score').textContent=s.awayScore;
    document.getElementById('phase-label').textContent=phaseLabel(s);
    const cl=document.getElementById('clock');
    cl.textContent=fmt(s.timeRemaining); cl.className='clock';
    if(s.phase==='ended')cl.classList.add('ended');
    else if(s.phase==='break')cl.classList.add('break');
    else if(s.running)cl.classList.add('running');
    else cl.classList.add('paused');
    const toB=document.getElementById('to-banner');
    if(s.timeoutActive){toB.style.display='block';const n=s.timeoutActive==='home'?s.homeTeam:s.awayTeam;toB.textContent=\`⏱ TIMEOUT \${n.toUpperCase()} – \${fmt(s.timeoutRemaining)}\`;}else{toB.style.display='none';}
    document.getElementById('pen-home-title').textContent=\`Strafen \${s.homeTeam}\`;
    document.getElementById('pen-away-title').textContent=\`Strafen \${s.awayTeam}\`;
    document.getElementById('pen-home-list').innerHTML=s.penalties.filter(p=>p.team==='home').map(p=>\`<div class="pen-item"><span class="pen-num">#\${p.player||'?'}</span><span class="pen-rem">\${fmt(p.remaining)}</span></div>\`).join('');
    document.getElementById('pen-away-list').innerHTML=s.penalties.filter(p=>p.team==='away').map(p=>\`<div class="pen-item"><span class="pen-num">#\${p.player||'?'}</span><span class="pen-rem">\${fmt(p.remaining)}</span></div>\`).join('');
    const soRow=document.getElementById('so-row');
    soRow.style.display=s.phase==='shootout'?'flex':'none';
    document.getElementById('so-home-lbl').textContent=s.homeTeam;
    document.getElementById('so-away-lbl').textContent=s.awayTeam;
    document.getElementById('so-home').textContent=s.homeShootout;
    document.getElementById('so-away').textContent=s.awayShootout;
    document.getElementById('ended-banner').style.display=s.phase==='ended'?'block':'none';
  }
  const ctx=new(window.AudioContext||window.webkitAudioContext)();
  function playBuzzer(reason){ const o=ctx.createOscillator(),g=ctx.createGain(); o.connect(g);g.connect(ctx.destination); if(reason==='period'){o.frequency.value=220;g.gain.value=1.0;}else if(reason==='timeout'){o.frequency.value=660;g.gain.value=0.6;}else{o.frequency.value=440;g.gain.value=0.5;} o.start(); g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+(reason==='period'?2:0.8)); o.stop(ctx.currentTime+(reason==='period'?2:0.8)); }
</script>
</body>
</html>`
};

// ─── Files erstellen ──────────────────────────────────────────────────────────
console.log('\n🏒 Unihockey Matchuhr – Setup\n');

for (const [filePath, content] of Object.entries(files)) {
  const dir = path.dirname(filePath);
  if (dir !== '.') fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`  ✅ ${filePath}`);
}

console.log('\n✨ Fertig! Nächste Schritte:');
console.log('  1. npm install');
console.log('  2. npm start');
console.log('  3. Operator: http://localhost:3000/operator.html');
console.log('  4. Display:  http://localhost:3000/display.html\n');