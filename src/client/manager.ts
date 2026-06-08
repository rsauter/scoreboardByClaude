import { updateStatusBar } from './shared';
import type { GameMode } from '../shared/types';

interface Team {
  id: number;
  name: string;
  abbreviation: string;
  color: string;
  organization: string;
}

interface MatchItem {
  id: number;
  gameMode: GameMode;
  scheduledAt: string;
  playedAt?: string;
  homeTeam: Team;
  awayTeam: Team;
}

function toDateTimeLocalValue(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hour}:${minute}`;
}

function defaultScheduledAtLocal(): string {
  const now = new Date();
  now.setSeconds(0, 0);
  return toDateTimeLocalValue(now.toISOString());
}

let teams: Team[] = [];
let matches: MatchItem[] = [];
let activeTab: 'teams' | 'matches' = 'teams';

updateStatusBar();

async function loadTeams(): Promise<void> {
  const res = await fetch('/api/teams');
  teams = await res.json();
  renderTeamTable();
}

async function loadMatches(): Promise<void> {
  const res = await fetch('/api/matches');
  matches = await res.json();
  renderMatchTable();
}

function esc(str: unknown): string {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderTeamTable(): void {
  const tbody = document.getElementById('team-table-body')!;
  if (teams.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" class="text-center py-10 text-base-content/30">Noch keine Teams erfasst.</td></tr>';
    return;
  }

  tbody.innerHTML = teams.map(t => `
    <tr class="hover">
      <td>
        <span class="inline-block w-3.5 h-3.5 rounded-full mr-2 align-middle border border-white/20"
          style="background:${t.color}"></span>
        ${esc(t.name)}
      </td>
      <td>
        ${t.abbreviation
          ? `<span class="badge badge-outline badge-primary text-xs font-bold tracking-wider">${esc(t.abbreviation)}</span>`
          : '–'}
      </td>
      <td>${esc(t.organization) || '–'}</td>
      <td>
        <div class="flex gap-1 justify-end">
          <button class="btn btn-primary btn-xs" onclick="openTeamModal(${t.id})">✏️</button>
          <button class="btn btn-error btn-xs" onclick="deleteTeam(${t.id}, '${esc(t.name)}')">🗑️</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function renderMatchTable(): void {
  const tbody = document.getElementById('match-table-body')!;
  if (matches.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center py-10 text-base-content/30">Noch keine geplanten Matches erfasst.</td></tr>';
    return;
  }

  tbody.innerHTML = matches.map(m => `
    <tr class="hover">
      <td>${esc(m.homeTeam.abbreviation || m.homeTeam.name)}</td>
      <td>${esc(m.awayTeam.abbreviation || m.awayTeam.name)}</td>
      <td><span class="badge badge-outline">${esc(m.gameMode)}</span></td>
      <td>${new Date(m.scheduledAt).toLocaleString('de-CH')}</td>
      <td>
        ${m.playedAt
          ? `<span class="badge badge-success badge-soft">${new Date(m.playedAt).toLocaleString('de-CH')}</span>`
          : '<span class="text-base-content/40">–</span>'}
      </td>
      <td>
        <div class="flex gap-1 justify-end">
          <button class="btn btn-primary btn-xs" onclick="openMatchModal(${m.id})">✏️</button>
          <button class="btn btn-error btn-xs" onclick="deleteMatch(${m.id})">🗑️</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function populateTeamOptions(): void {
  const homeSelect = document.getElementById('match-modal-home') as HTMLSelectElement;
  const awaySelect = document.getElementById('match-modal-away') as HTMLSelectElement;

  const options = ['<option value="">Bitte Team wählen</option>'].concat(
    teams.map(t => `<option value="${t.id}">${esc(t.abbreviation || t.name)} - ${esc(t.name)}</option>`)
  ).join('');

  homeSelect.innerHTML = options;
  awaySelect.innerHTML = options;
}

function openTeamModal(id: number | null = null): void {
  document.getElementById('modal-error')!.classList.add('hidden');

  if (id !== null) {
    const t = teams.find(team => team.id === id);
    if (!t) return;
    (document.getElementById('modal-title') as HTMLElement).textContent = 'Team bearbeiten';
    (document.getElementById('modal-id') as HTMLInputElement).value = String(t.id);
    (document.getElementById('modal-name') as HTMLInputElement).value = t.name;
    (document.getElementById('modal-abbr') as HTMLInputElement).value = t.abbreviation;
    (document.getElementById('modal-color-picker') as HTMLInputElement).value = t.color;
    (document.getElementById('modal-color-hex') as HTMLInputElement).value = t.color;
    (document.getElementById('modal-org') as HTMLInputElement).value = t.organization;
  } else {
    (document.getElementById('modal-title') as HTMLElement).textContent = 'Team erfassen';
    (document.getElementById('modal-id') as HTMLInputElement).value = '';
    (document.getElementById('modal-name') as HTMLInputElement).value = '';
    (document.getElementById('modal-abbr') as HTMLInputElement).value = '';
    (document.getElementById('modal-color-picker') as HTMLInputElement).value = '#00d4ff';
    (document.getElementById('modal-color-hex') as HTMLInputElement).value = '#00d4ff';
    (document.getElementById('modal-org') as HTMLInputElement).value = '';
  }

  (document.getElementById('team-modal') as HTMLDialogElement).showModal();
  setTimeout(() => (document.getElementById('modal-name') as HTMLInputElement).focus(), 50);
}

function closeTeamModal(): void {
  (document.getElementById('team-modal') as HTMLDialogElement).close();
}

async function saveTeam(): Promise<void> {
  const id = (document.getElementById('modal-id') as HTMLInputElement).value;
  const name = (document.getElementById('modal-name') as HTMLInputElement).value.trim();
  const abbr = (document.getElementById('modal-abbr') as HTMLInputElement).value.trim().toUpperCase();
  const color = (document.getElementById('modal-color-hex') as HTMLInputElement).value.trim() || '#00d4ff';
  const org = (document.getElementById('modal-org') as HTMLInputElement).value.trim();

  if (!name) {
    document.getElementById('modal-error')!.classList.remove('hidden');
    return;
  }

  const body = JSON.stringify({ name, abbreviation: abbr, color, organization: org });
  const headers = { 'Content-Type': 'application/json' };

  if (id) {
    await fetch(`/api/teams/${id}`, { method: 'PUT', headers, body });
  } else {
    await fetch('/api/teams', { method: 'POST', headers, body });
  }

  closeTeamModal();
  await loadTeams();
}

async function deleteTeam(id: number, name: string): Promise<void> {
  if (!confirm(`Team "${name}" wirklich löschen?`)) return;
  await fetch(`/api/teams/${id}`, { method: 'DELETE' });
  await loadTeams();
}

function openMatchModal(id: number | null = null): void {
  const errorEl = document.getElementById('match-modal-error')!;
  errorEl.textContent = '';
  errorEl.classList.add('hidden');

  populateTeamOptions();

  if (id !== null) {
    const m = matches.find(match => match.id === id);
    if (!m) return;
    (document.getElementById('match-modal-title') as HTMLElement).textContent = 'Match bearbeiten';
    (document.getElementById('match-modal-id') as HTMLInputElement).value = String(m.id);
    (document.getElementById('match-modal-home') as HTMLSelectElement).value = String(m.homeTeam.id);
    (document.getElementById('match-modal-away') as HTMLSelectElement).value = String(m.awayTeam.id);
    (document.getElementById('match-modal-mode') as HTMLSelectElement).value = m.gameMode;
    (document.getElementById('match-modal-scheduled-at') as HTMLInputElement).value = toDateTimeLocalValue(m.scheduledAt);
  } else {
    (document.getElementById('match-modal-title') as HTMLElement).textContent = 'Match erfassen';
    (document.getElementById('match-modal-id') as HTMLInputElement).value = '';
    (document.getElementById('match-modal-home') as HTMLSelectElement).value = '';
    (document.getElementById('match-modal-away') as HTMLSelectElement).value = '';
    (document.getElementById('match-modal-mode') as HTMLSelectElement).value = '3x20';
    (document.getElementById('match-modal-scheduled-at') as HTMLInputElement).value = defaultScheduledAtLocal();
  }

  (document.getElementById('match-modal') as HTMLDialogElement).showModal();
}

function closeMatchModal(): void {
  (document.getElementById('match-modal') as HTMLDialogElement).close();
}

async function saveMatch(): Promise<void> {
  const id = (document.getElementById('match-modal-id') as HTMLInputElement).value;
  const homeTeamId = parseInt((document.getElementById('match-modal-home') as HTMLSelectElement).value, 10);
  const awayTeamId = parseInt((document.getElementById('match-modal-away') as HTMLSelectElement).value, 10);
  const gameMode = (document.getElementById('match-modal-mode') as HTMLSelectElement).value as GameMode;
  const scheduledAtInput = (document.getElementById('match-modal-scheduled-at') as HTMLInputElement).value;
  const errorEl = document.getElementById('match-modal-error')!;

  if (!homeTeamId || !awayTeamId) {
    errorEl.textContent = 'Bitte Heim- und Gast-Team wählen.';
    errorEl.classList.remove('hidden');
    return;
  }

  if (homeTeamId === awayTeamId) {
    errorEl.textContent = 'Heim- und Gast-Team müssen unterschiedlich sein.';
    errorEl.classList.remove('hidden');
    return;
  }

  if (!scheduledAtInput) {
    errorEl.textContent = 'Bitte Datum und Uhrzeit setzen.';
    errorEl.classList.remove('hidden');
    return;
  }

  const body = JSON.stringify({
    homeTeamId,
    awayTeamId,
    gameMode,
    scheduledAt: new Date(scheduledAtInput).toISOString(),
  });
  const headers = { 'Content-Type': 'application/json' };

  if (id) {
    await fetch(`/api/matches/${id}`, { method: 'PUT', headers, body });
  } else {
    await fetch('/api/matches', { method: 'POST', headers, body });
  }

  closeMatchModal();
  await loadMatches();
}

async function deleteMatch(id: number): Promise<void> {
  if (!confirm('Geplantes Match wirklich löschen?')) return;
  await fetch(`/api/matches/${id}`, { method: 'DELETE' });
  await loadMatches();
}

function syncColorHex(): void {
  (document.getElementById('modal-color-hex') as HTMLInputElement).value =
    (document.getElementById('modal-color-picker') as HTMLInputElement).value;
}

function syncColorPicker(): void {
  const hex = (document.getElementById('modal-color-hex') as HTMLInputElement).value;
  if (/^#[0-9a-fA-F]{6}$/.test(hex)) {
    (document.getElementById('modal-color-picker') as HTMLInputElement).value = hex;
  }
}

function showTab(tab: 'teams' | 'matches', el: HTMLElement): void {
  activeTab = tab;
  document.querySelectorAll('[role=tab]').forEach(t => t.classList.remove('tab-active'));
  el.classList.add('tab-active');

  const teamsPanel = document.getElementById('tab-teams')!;
  const matchesPanel = document.getElementById('tab-matches')!;
  if (tab === 'teams') {
    teamsPanel.classList.remove('hidden');
    matchesPanel.classList.add('hidden');
  } else {
    matchesPanel.classList.remove('hidden');
    teamsPanel.classList.add('hidden');
  }
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeTeamModal();
    closeMatchModal();
  }
});

Promise.all([loadTeams(), loadMatches()]);

// Globale Funktionen für onclick-Handler im HTML
(window as any).openTeamModal = openTeamModal;
(window as any).closeTeamModal = closeTeamModal;
(window as any).saveTeam = saveTeam;
(window as any).deleteTeam = deleteTeam;
(window as any).openMatchModal = openMatchModal;
(window as any).closeMatchModal = closeMatchModal;
(window as any).saveMatch = saveMatch;
(window as any).deleteMatch = deleteMatch;
(window as any).syncColorHex = syncColorHex;
(window as any).syncColorPicker = syncColorPicker;
(window as any).showTab = showTab;
