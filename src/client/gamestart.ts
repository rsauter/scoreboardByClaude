import { updateStatusBar } from './shared';
import type { ClientCommand } from '../shared/types';

const wsUrl = location.port === '5173' ? `ws://localhost:3000` : `ws://${location.host}`;
const ws = new WebSocket(wsUrl);
let knownTeams: { name: string; abbreviation: string; organization: string }[] = [];

ws.onopen  = () => updateStatusBar('🟢 Verbunden');
ws.onclose = () => updateStatusBar('🔴 Getrennt – Seite neu laden');

async function loadTeams() {
  try {
    const res = await fetch('/api/teams');
    if (res.ok) knownTeams = await res.json();
  } catch { }
}
loadTeams();

function onTeamInput(side: 'home' | 'away') {
  const inputEl   = document.getElementById(`cfg-${side}`) as HTMLInputElement;
  const suggestEl = document.getElementById(`${side}-suggestions`) as HTMLDivElement;
  const val = inputEl.value.trim().toLowerCase();
  if (!val || knownTeams.length === 0) { suggestEl.style.display = 'none'; return; }
  const matches = knownTeams.filter(
    t => t.name.toLowerCase().includes(val) ||
         t.abbreviation.toLowerCase().includes(val) ||
         t.organization.toLowerCase().includes(val)
  );
  if (matches.length === 0) { suggestEl.style.display = 'none'; return; }
  suggestEl.innerHTML = matches.map(
    t => `<div onclick="selectTeam('${side}','${t.abbreviation.replace(/'/g, "\\'")}')"> ${t.abbreviation}</div>`
  ).join('');
  suggestEl.style.display = 'block';
}

function selectTeam(side: 'home' | 'away', name: string) {
  (document.getElementById(`cfg-${side}`) as HTMLInputElement).value = name;
  (document.getElementById(`${side}-suggestions`) as HTMLDivElement).style.display = 'none';
}

document.addEventListener('click', e => {
  (['home', 'away'] as const).forEach(side => {
    const group = document.getElementById(`${side}-group`)!;
    if (!group.contains(e.target as Node)) {
      (document.getElementById(`${side}-suggestions`) as HTMLDivElement).style.display = 'none';
    }
  });
});

function startGame() {
  const homeTeam      = (document.getElementById('cfg-home') as HTMLInputElement).value.trim() || 'Heim';
  const awayTeam      = (document.getElementById('cfg-away') as HTMLInputElement).value.trim() || 'Gast';
  const gameMode      = (document.getElementById('cfg-mode') as HTMLSelectElement).value as ClientCommand & { cmd: 'SET_CONFIG' } extends { gameMode: infer G } ? G : string;
  const breakDuration = parseInt((document.getElementById('cfg-break') as HTMLSelectElement).value);
  const otDuration    = parseInt((document.getElementById('cfg-ot') as HTMLSelectElement).value);
  ws.send(JSON.stringify({ cmd: 'SET_CONFIG', homeTeam, awayTeam, gameMode, breakDuration, otDuration }));
  setTimeout(() => { window.location.href = '/operator.html'; }, 200);
}

// Globale Funktionen für onclick-Handler im HTML
(window as any).onTeamInput = onTeamInput;
(window as any).selectTeam  = selectTeam;
(window as any).startGame   = startGame;