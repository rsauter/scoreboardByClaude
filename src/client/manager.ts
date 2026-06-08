import { updateStatusBar } from './shared';

interface Team {
  id: number;
  name: string;
  abbreviation: string;
  color: string;
  organization: string;
}

let teams: Team[] = [];
updateStatusBar();

async function loadTeams(): Promise<void> {
  const res = await fetch('/api/teams');
  teams = await res.json();
  renderTable();
}

async function saveTeam(): Promise<void> {
  const id    = (document.getElementById('modal-id') as HTMLInputElement).value;
  const name  = (document.getElementById('modal-name') as HTMLInputElement).value.trim();
  const abbr  = (document.getElementById('modal-abbr') as HTMLInputElement).value.trim().toUpperCase();
  const color = (document.getElementById('modal-color-hex') as HTMLInputElement).value.trim() || '#00d4ff';
  const org   = (document.getElementById('modal-org') as HTMLInputElement).value.trim();

  if (!name) {
    document.getElementById('modal-error')!.classList.remove('hidden');
    return;
  }

  const body    = JSON.stringify({ name, abbreviation: abbr, color, organization: org });
  const headers = { 'Content-Type': 'application/json' };

  if (id) {
    await fetch(`/api/teams/${id}`, { method: 'PUT', headers, body });
  } else {
    await fetch('/api/teams', { method: 'POST', headers, body });
  }

  closeModal();
  loadTeams();
}

async function deleteTeam(id: number, name: string): Promise<void> {
  if (!confirm(`Team "${name}" wirklich löschen?`)) return;
  await fetch(`/api/teams/${id}`, { method: 'DELETE' });
  loadTeams();
}

function esc(str: unknown): string {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderTable(): void {
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
          <button class="btn btn-primary btn-xs" onclick="openModal(${t.id})">✏️</button>
          <button class="btn btn-error btn-xs" onclick="deleteTeam(${t.id}, '${esc(t.name)}')">🗑️</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function openModal(id: number | null = null): void {
  document.getElementById('modal-error')!.classList.add('hidden');
  if (id !== null) {
    const t = teams.find(t => t.id === id)!;
    (document.getElementById('modal-title') as HTMLElement).textContent              = 'Team bearbeiten';
    (document.getElementById('modal-id') as HTMLInputElement).value                  = String(t.id);
    (document.getElementById('modal-name') as HTMLInputElement).value                = t.name;
    (document.getElementById('modal-abbr') as HTMLInputElement).value                = t.abbreviation;
    (document.getElementById('modal-color-picker') as HTMLInputElement).value        = t.color;
    (document.getElementById('modal-color-hex') as HTMLInputElement).value           = t.color;
    (document.getElementById('modal-org') as HTMLInputElement).value                 = t.organization;
  } else {
    (document.getElementById('modal-title') as HTMLElement).textContent              = 'Team erfassen';
    (document.getElementById('modal-id') as HTMLInputElement).value                  = '';
    (document.getElementById('modal-name') as HTMLInputElement).value                = '';
    (document.getElementById('modal-abbr') as HTMLInputElement).value                = '';
    (document.getElementById('modal-color-picker') as HTMLInputElement).value        = '#00d4ff';
    (document.getElementById('modal-color-hex') as HTMLInputElement).value           = '#00d4ff';
    (document.getElementById('modal-org') as HTMLInputElement).value                 = '';
  }
  (document.getElementById('team-modal') as HTMLDialogElement).showModal();
  setTimeout(() => (document.getElementById('modal-name') as HTMLInputElement).focus(), 50);
}

function closeModal(): void {
  (document.getElementById('team-modal') as HTMLDialogElement).close();
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

function showTab(tab: string, el: HTMLElement): void {
  document.querySelectorAll('[role=tab]').forEach(t => t.classList.remove('tab-active'));
  el.classList.add('tab-active');
}

document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
loadTeams();

// Globale Funktionen für onclick-Handler im HTML
(window as any).openModal      = openModal;
(window as any).closeModal     = closeModal;
(window as any).saveTeam       = saveTeam;
(window as any).deleteTeam     = deleteTeam;
(window as any).syncColorHex   = syncColorHex;
(window as any).syncColorPicker = syncColorPicker;
(window as any).showTab        = showTab;