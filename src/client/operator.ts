import { fmt, phaseLabel, updateStatusBar } from './shared';
import type { GameState, ServerMessage, ClientCommand } from '../shared/types';

const wsUrl = location.port === '5173' ? `ws://localhost:3000` : `ws://${location.host}`;
const ws = new WebSocket(wsUrl);
let st: GameState | null = null;

ws.onopen    = () => updateStatusBar('🟢 Verbunden');
ws.onclose   = () => updateStatusBar('🔴 Getrennt – Seite neu laden');
ws.onmessage = e => {
  const m: ServerMessage = JSON.parse(e.data);
  if (m.type === 'STATE') { st = m.state; render(m.state); }
  if (m.type === 'BUZZER') playBuzzer(m.reason);
};

function send(cmd: ClientCommand['cmd'], extra: Partial<ClientCommand> = {}) {
  ws.send(JSON.stringify({ cmd, ...extra }));
}

function adjustTime(delta: number) { send('ADJUST_TIME', { delta } as any); }

function addPenalty() {
  send('ADD_PENALTY', {
    team:     (document.getElementById('pen-team') as HTMLSelectElement).value as 'home' | 'away',
    player:   (document.getElementById('pen-player') as HTMLInputElement).value,
    duration: parseInt((document.getElementById('pen-duration') as HTMLSelectElement).value),
  } as any);
  (document.getElementById('pen-player') as HTMLInputElement).value = '';
}

function confirmReset() {
  if (confirm('Spiel wirklich zurücksetzen? Du wirst zu Spielstart weitergeleitet.')) {
    send('RESET');
    setTimeout(() => { window.location.href = '/gamestart.html'; }, 200);
  }
}

function render(s: GameState) {
  document.getElementById('clock')!.textContent       = fmt(s.timeRemaining);
  document.getElementById('phase-label')!.textContent = phaseLabel(s);

  const adjustEl   = document.getElementById('time-adjust')!;
  const showAdjust = !s.running && !s.timeoutActive && ['period', 'overtime'].includes(s.phase);
  adjustEl.classList.toggle('hidden', !showAdjust);
  adjustEl.classList.toggle('flex',    showAdjust);

  document.getElementById('op-home-name')!.textContent  = s.homeTeam;
  document.getElementById('op-away-name')!.textContent  = s.awayTeam;
  document.getElementById('op-home-score')!.textContent = String(s.homeScore);
  document.getElementById('op-away-score')!.textContent = String(s.awayScore);
  document.getElementById('to-home-name')!.textContent  = s.homeTeam;
  document.getElementById('to-away-name')!.textContent  = s.awayTeam;
  document.getElementById('to-home-left')!.textContent  = `TO verfügbar: ${s.homeTimeouts}`;
  document.getElementById('to-away-left')!.textContent  = `TO verfügbar: ${s.awayTimeouts}`;

  (document.getElementById('btn-to-home') as HTMLButtonElement).disabled = s.homeTimeouts === 0 || !!s.timeoutActive;
  (document.getElementById('btn-to-away') as HTMLButtonElement).disabled = s.awayTimeouts === 0 || !!s.timeoutActive;

  const toEl = document.getElementById('to-remaining')!;
  if (s.timeoutActive) { toEl.classList.remove('hidden'); toEl.textContent = fmt(s.timeoutRemaining); }
  else                 { toEl.classList.add('hidden'); }

  document.getElementById('penalty-list')!.innerHTML = s.penalties.map(p =>
    `<li class="flex justify-between items-center bg-base-200 rounded px-3 py-1 text-sm">
       <span>${p.team === 'home' ? s.homeTeam : s.awayTeam} #${p.player || '?'} – ${Math.floor(p.duration / 60)} min</span>
       <span class="font-bold text-error">${fmt(p.remaining)}</span>
       <button class="btn btn-ghost btn-xs" onclick="removePenalty(${p.id})">✕</button>
     </li>`
  ).join('');

  const soCard = document.getElementById('shootout-card')!;
  soCard.classList.toggle('hidden', s.phase !== 'shootout');
  document.getElementById('so-home-name')!.textContent  = s.homeTeam;
  document.getElementById('so-away-name')!.textContent  = s.awayTeam;
  document.getElementById('so-home-score')!.textContent = String(s.homeShootout);
  document.getElementById('so-away-score')!.textContent = String(s.awayShootout);
}

const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
function playBuzzer(reason: string) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.connect(g); g.connect(ctx.destination);
  if      (reason === 'period')  { o.frequency.value = 220; g.gain.value = 0.8; }
  else if (reason === 'timeout') { o.frequency.value = 660; g.gain.value = 0.5; }
  else                           { o.frequency.value = 440; g.gain.value = 0.4; }
  o.start();
  const dur = reason === 'period' ? 1.5 : 0.6;
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
  o.stop(ctx.currentTime + dur);
}

// Globale Funktionen für onclick-Handler im HTML
(window as any).send          = send;
(window as any).adjustTime    = adjustTime;
(window as any).addPenalty    = addPenalty;
(window as any).confirmReset  = confirmReset;
(window as any).removePenalty = (id: number) => send('REMOVE_PENALTY', { id } as any);