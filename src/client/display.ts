import { fmt, phaseLabel } from './shared';
import type { GameState, ServerMessage } from '../shared/types';

const wsUrl = location.port === '5173' ? `ws://localhost:3000` : `ws://${location.host}`;
const ws = new WebSocket(wsUrl);
const dot = document.getElementById('conn-dot')!;

ws.onopen  = () => dot.textContent = '🟢';
ws.onclose = () => dot.textContent = '🔴';
ws.onmessage = e => {
  const m: ServerMessage = JSON.parse(e.data);
  if (m.type === 'STATE') render(m.state);
  if (m.type === 'BUZZER') playBuzzer(m.reason);
};

function render(s: GameState) {
  document.getElementById('home-name')!.textContent   = s.homeTeam.toUpperCase();
  document.getElementById('away-name')!.textContent   = s.awayTeam.toUpperCase();
  document.getElementById('home-score')!.textContent  = String(s.homeScore);
  document.getElementById('away-score')!.textContent  = String(s.awayScore);
  document.getElementById('phase-label')!.textContent = phaseLabel(s);

  const cl = document.getElementById('clock')!;
  cl.textContent = fmt(s.timeRemaining);
  cl.className = 'clock';
  if      (s.phase === 'ended') cl.classList.add('ended');
  else if (s.phase === 'break') cl.classList.add('break');
  else if (s.running)           cl.classList.add('running');
  else                          cl.classList.add('paused');

  const toB = document.getElementById('to-banner')!;
  if (s.timeoutActive) {
    toB.style.display = 'block';
    const n = s.timeoutActive === 'home' ? s.homeTeam : s.awayTeam;
    toB.textContent = `⏱ TIMEOUT ${n.toUpperCase()} – ${fmt(s.timeoutRemaining)}`;
  } else {
    toB.style.display = 'none';
  }

  document.getElementById('pen-home-title')!.textContent = `Strafen ${s.homeTeam}`;
  document.getElementById('pen-away-title')!.textContent = `Strafen ${s.awayTeam}`;
  document.getElementById('pen-home-list')!.innerHTML = s.penalties
    .filter(p => p.team === 'home')
    .map(p => `<div class="pen-item"><span class="pen-num">#${p.player || '?'}</span><span class="pen-rem">${fmt(p.remaining)}</span></div>`)
    .join('');
  document.getElementById('pen-away-list')!.innerHTML = s.penalties
    .filter(p => p.team === 'away')
    .map(p => `<div class="pen-item"><span class="pen-num">#${p.player || '?'}</span><span class="pen-rem">${fmt(p.remaining)}</span></div>`)
    .join('');

  const soRow = document.getElementById('so-row')!;
  soRow.style.display = s.phase === 'shootout' ? 'flex' : 'none';
  document.getElementById('so-home-lbl')!.textContent = s.homeTeam;
  document.getElementById('so-away-lbl')!.textContent = s.awayTeam;
  document.getElementById('so-home')!.textContent     = String(s.homeShootout);
  document.getElementById('so-away')!.textContent     = String(s.awayShootout);

  document.getElementById('ended-banner')!.style.display = s.phase === 'ended' ? 'block' : 'none';

  const bullet = document.getElementById('game-status-bullet')!;
  bullet.className = 'game-status-bullet';
  if      (s.phase === 'ended' || s.phase === 'pregame') bullet.classList.add('inactive');
  else if (s.timeoutActive)                              bullet.classList.add('timeout');
  else if (s.running)                                    bullet.classList.add('running');
  else                                                   bullet.classList.add('stopped');
}

const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
function playBuzzer(reason: string) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.connect(g); g.connect(ctx.destination);
  if      (reason === 'period')  { o.frequency.value = 220; g.gain.value = 1.0; }
  else if (reason === 'timeout') { o.frequency.value = 660; g.gain.value = 0.6; }
  else                           { o.frequency.value = 440; g.gain.value = 0.5; }
  o.start();
  const dur = reason === 'period' ? 2 : 0.8;
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
  o.stop(ctx.currentTime + dur);
}