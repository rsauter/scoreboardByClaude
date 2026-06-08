import { updateStatusBar } from './shared';
import type { ClientCommand } from '../shared/types';

const wsUrl = location.port === '5173' ? `ws://localhost:3000` : `ws://${location.host}`;
const ws = new WebSocket(wsUrl);
let knownTeams: { name: string; abbreviation: string; organization: string }[] = [];
let plannedMatches: {
  id: number;
  gameMode: '1x24' | '2x20' | '3x20';
  scheduledAt: string;
  homeTeam: { name: string; abbreviation: string };
  awayTeam: { name: string; abbreviation: string };
}[] = [];

ws.onopen  = () => updateStatusBar('🟢 Verbunden');
ws.onclose = () => updateStatusBar('🔴 Getrennt – Seite neu laden');

async function loadTeams() {
  try {
    const res = await fetch('/api/teams');
    if (res.ok) knownTeams = await res.json();
  } catch { }
}
loadTeams();

async function loadPlannedMatches() {
  try {
    const res = await fetch('/api/matches');
    if (!res.ok) return;
    plannedMatches = await res.json();

    const select = document.getElementById('cfg-match') as HTMLSelectElement;
    const options = [
      '<option value="">Neues Match (Recovery-Datensatz)</option>',
      ...plannedMatches.map(m => {
        const home = m.homeTeam.abbreviation || m.homeTeam.name;
        const away = m.awayTeam.abbreviation || m.awayTeam.name;
        const scheduled = new Date(m.scheduledAt).toLocaleString('de-CH', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
        return `<option value="${m.id}">#${m.id} ${home} vs ${away} (${m.gameMode}) - ${scheduled}</option>`;
      })
    ];
    select.innerHTML = options.join('');
  } catch { }
}
loadPlannedMatches();

function onPlannedMatchChange() {
  const matchId = parseInt((document.getElementById('cfg-match') as HTMLSelectElement).value, 10);
  if (!matchId) return;

  const selected = plannedMatches.find(m => m.id === matchId);
  if (!selected) return;

  (document.getElementById('cfg-home') as HTMLInputElement).value = selected.homeTeam.abbreviation || selected.homeTeam.name;
  (document.getElementById('cfg-away') as HTMLInputElement).value = selected.awayTeam.abbreviation || selected.awayTeam.name;
  (document.getElementById('cfg-mode') as HTMLSelectElement).value = selected.gameMode;
}

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
  const selectedMatch = (document.getElementById('cfg-match') as HTMLSelectElement).value;
  const matchId = selectedMatch ? parseInt(selectedMatch, 10) : undefined;
  ws.send(JSON.stringify({ cmd: 'SET_CONFIG', homeTeam, awayTeam, gameMode, breakDuration, otDuration, matchId }));
  setTimeout(() => { window.location.href = '/operator.html'; }, 200);
}

// Globale Funktionen für onclick-Handler im HTML
(window as any).onTeamInput = onTeamInput;
(window as any).selectTeam  = selectTeam;
(window as any).onPlannedMatchChange = onPlannedMatchChange;
(window as any).startGame   = startGame;