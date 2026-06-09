<template>
  <div class="bg-base-300 p-4 min-h-screen">
    <div id="conn-status" class="alert alert-info py-1 px-4 text-sm mb-4 justify-center">{{ statusText }}</div>

    <div class="flex items-center justify-between mb-5">
      <h1 class="text-2xl font-bold text-primary">⚙️ Stammdaten</h1>
    </div>

    <div role="tablist" class="tabs tabs-bordered mb-4">
      <button role="tab" :class="['tab', activeTab === 'teams' ? 'tab-active' : '']" @click="activeTab = 'teams'">Teams</button>
      <button role="tab" :class="['tab', activeTab === 'matches' ? 'tab-active' : '']" @click="activeTab = 'matches'">Matches</button>
      <button role="tab" class="tab tab-disabled" disabled title="Kommt später">Spieler</button>
    </div>

    <section v-if="activeTab === 'teams'" class="tab-panel">
      <div class="flex items-center justify-end mb-3">
        <button @click="openTeamModal()" class="btn btn-primary btn-sm">+ Team</button>
      </div>
      <div class="card bg-base-100 shadow overflow-x-auto">
        <table class="table table-sm w-full">
          <thead>
            <tr class="text-xs text-base-content/50 uppercase tracking-wider">
              <th>Name</th>
              <th>Kürzel</th>
              <th>Organisation</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="teams.length === 0">
              <td colspan="4" class="text-center py-10 text-base-content/30">Noch keine Teams erfasst.</td>
            </tr>
            <tr v-for="team in teams" :key="team.id" class="hover">
              <td>
                <span class="inline-block w-3.5 h-3.5 rounded-full mr-2 align-middle border border-white/20" :style="{ background: team.color }"></span>
                {{ team.name }}
              </td>
              <td>
                <span v-if="team.abbreviation" class="badge badge-outline badge-primary text-xs font-bold tracking-wider">{{ team.abbreviation }}</span>
                <span v-else>–</span>
              </td>
              <td>{{ team.organization || '–' }}</td>
              <td>
                <div class="flex gap-1 justify-end">
                  <button class="btn btn-primary btn-xs" @click="openTeamModal(team)">✏️</button>
                  <button class="btn btn-error btn-xs" @click="deleteTeam(team)">🗑️</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section v-if="activeTab === 'matches'" class="tab-panel">
      <div class="flex items-center justify-end mb-3">
        <button @click="openMatchModal()" class="btn btn-primary btn-sm">+ Match</button>
      </div>
      <div class="card bg-base-100 shadow overflow-x-auto">
        <table class="table table-sm w-full">
          <thead>
            <tr class="text-xs text-base-content/50 uppercase tracking-wider">
              <th>Heim</th>
              <th>Gast</th>
              <th>Modus</th>
              <th>Geplant</th>
              <th>Start effektiv</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="matches.length === 0">
              <td colspan="6" class="text-center py-10 text-base-content/30">Noch keine geplanten Matches erfasst.</td>
            </tr>
            <tr v-for="match in matches" :key="match.id" class="hover">
              <td>{{ match.homeTeam.abbreviation || match.homeTeam.name }}</td>
              <td>{{ match.awayTeam.abbreviation || match.awayTeam.name }}</td>
              <td><span class="badge badge-outline">{{ match.gameMode }}</span></td>
              <td>{{ formatDate(match.scheduledAt) }}</td>
              <td>
                <span v-if="match.playedAt" class="badge badge-success badge-soft">{{ formatDate(match.playedAt) }}</span>
                <span v-else class="text-base-content/40">–</span>
              </td>
              <td>
                <div class="flex gap-1 justify-end">
                  <button class="btn btn-primary btn-xs" @click="openMatchModal(match)">✏️</button>
                  <button class="btn btn-error btn-xs" @click="deleteMatch(match)">🗑️</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <dialog class="modal" ref="teamModal">
      <div class="modal-box max-w-md">
        <button class="btn btn-sm btn-circle btn-ghost absolute right-3 top-3" @click.prevent="closeTeamModal">✕</button>
        <h3 class="font-bold text-lg mb-5">{{ teamModalTitle }}</h3>

        <input type="hidden" v-model="teamForm.id">

        <div class="mb-3">
          <label class="label py-0 mb-1"><span class="label-text text-xs">Name *</span></label>
          <input type="text" v-model="teamForm.name" placeholder="z.B. D Orange" class="input input-bordered input-sm w-full">
        </div>
        <div class="mb-3">
          <label class="label py-0 mb-1"><span class="label-text text-xs">Kürzel</span></label>
          <input type="text" v-model="teamForm.abbreviation" placeholder="z.B. DOR" maxlength="5" class="input input-bordered input-sm w-full">
        </div>
        <div class="mb-3">
          <label class="label py-0 mb-1"><span class="label-text text-xs">Farbe</span></label>
          <div class="flex gap-2 items-center">
            <input type="color" v-model="teamForm.color" class="w-11 h-9 rounded border border-base-content/20 bg-base-200 cursor-pointer p-0.5 shrink-0">
            <input type="text" v-model="teamForm.color" placeholder="#00d4ff" class="input input-bordered input-sm flex-1">
          </div>
        </div>
        <div class="mb-1">
          <label class="label py-0 mb-1"><span class="label-text text-xs">Organisation</span></label>
          <input type="text" v-model="teamForm.organization" placeholder="z.B. Hornets" class="input input-bordered input-sm w-full">
        </div>
        <div v-if="teamModalError" class="text-error text-sm mt-2">{{ teamModalError }}</div>

        <div class="modal-action">
          <button class="btn btn-ghost btn-sm" @click.prevent="closeTeamModal">Abbrechen</button>
          <button class="btn btn-success btn-sm" @click.prevent="saveTeam">Speichern</button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop"><button>close</button></form>
    </dialog>

    <dialog class="modal" ref="matchModal">
      <div class="modal-box max-w-md">
        <button class="btn btn-sm btn-circle btn-ghost absolute right-3 top-3" @click.prevent="closeMatchModal">✕</button>
        <h3 class="font-bold text-lg mb-5">{{ matchModalTitle }}</h3>

        <input type="hidden" v-model="matchForm.id">

        <div class="mb-3">
          <label class="label py-0 mb-1"><span class="label-text text-xs">Heim-Team *</span></label>
          <select v-model.number="matchForm.homeTeamId" class="select select-bordered select-sm w-full">
            <option value="">Bitte Team wählen</option>
            <option v-for="team in teams" :key="team.id" :value="team.id">{{ team.abbreviation || team.name }} - {{ team.name }}</option>
          </select>
        </div>
        <div class="mb-3">
          <label class="label py-0 mb-1"><span class="label-text text-xs">Gast-Team *</span></label>
          <select v-model.number="matchForm.awayTeamId" class="select select-bordered select-sm w-full">
            <option value="">Bitte Team wählen</option>
            <option v-for="team in teams" :key="team.id" :value="team.id">{{ team.abbreviation || team.name }} - {{ team.name }}</option>
          </select>
        </div>
        <div class="mb-1">
          <label class="label py-0 mb-1"><span class="label-text text-xs">Spielmodus *</span></label>
          <select v-model="matchForm.gameMode" class="select select-bordered select-sm w-full">
            <option value="1x24">1 × 24 min (E-Junioren)</option>
            <option value="2x20">2 × 20 min (Halbzeiten)</option>
            <option value="3x20">3 × 20 min (Dritteln)</option>
          </select>
        </div>
        <div class="mt-3 mb-1">
          <label class="label py-0 mb-1"><span class="label-text text-xs">Geplant am *</span></label>
          <input type="datetime-local" v-model="matchForm.scheduledAt" class="input input-bordered input-sm w-full">
        </div>
        <div v-if="matchModalError" class="text-error text-sm mt-2">{{ matchModalError }}</div>

        <div class="modal-action">
          <button class="btn btn-ghost btn-sm" @click.prevent="closeMatchModal">Abbrechen</button>
          <button class="btn btn-success btn-sm" @click.prevent="saveMatch">Speichern</button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop"><button>close</button></form>
    </dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { updateStatusBar } from '../shared';

interface Team {
  id: number;
  name: string;
  abbreviation: string;
  color: string;
  organization: string;
}

interface MatchItem {
  id: number;
  gameMode: '1x24' | '2x20' | '3x20';
  scheduledAt: string;
  playedAt?: string;
  homeTeam: Team;
  awayTeam: Team;
}

const statusText = ref('Verbinde...');
const activeTab = ref<'teams' | 'matches'>('teams');
const teams = ref<Team[]>([]);
const matches = ref<MatchItem[]>([]);
const teamModal = ref<HTMLDialogElement | null>(null);
const matchModal = ref<HTMLDialogElement | null>(null);
const teamForm = ref({ id: 0, name: '', abbreviation: '', color: '#00d4ff', organization: '' });
const matchForm = ref({ id: 0, homeTeamId: 0, awayTeamId: 0, gameMode: '3x20' as '1x24' | '2x20' | '3x20', scheduledAt: '' });
const teamModalError = ref('');
const matchModalError = ref('');

const teamModalTitle = computed(() => teamForm.value.id ? 'Team bearbeiten' : 'Team erfassen');
const matchModalTitle = computed(() => matchForm.value.id ? 'Match bearbeiten' : 'Match erfassen');

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

async function loadTeams() {
  const res = await fetch('/api/teams');
  teams.value = res.ok ? await res.json() : [];
}

async function loadMatches() {
  const res = await fetch('/api/matches');
  matches.value = res.ok ? await res.json() : [];
}

function openTeamModal(team?: Team) {
  teamModalError.value = '';
  if (team) {
    teamForm.value = { ...team };
  } else {
    teamForm.value = { id: 0, name: '', abbreviation: '', color: '#00d4ff', organization: '' };
  }
  teamModal.value?.showModal();
}

function closeTeamModal() {
  teamModalError.value = '';
  teamModal.value?.close();
}

async function saveTeam() {
  if (!teamForm.value.name.trim()) {
    teamModalError.value = 'Name ist Pflichtfeld.';
    return;
  }
  const payload = {
    name: teamForm.value.name.trim(),
    abbreviation: teamForm.value.abbreviation.trim().toUpperCase(),
    color: teamForm.value.color.trim() || '#00d4ff',
    organization: teamForm.value.organization.trim(),
  };
  const method = teamForm.value.id ? 'PUT' : 'POST';
  const url = teamForm.value.id ? `/api/teams/${teamForm.value.id}` : '/api/teams';
  await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  closeTeamModal();
  await loadTeams();
}

async function deleteTeam(team: Team) {
  if (!confirm(`Team "${team.name}" wirklich löschen?`)) return;
  await fetch(`/api/teams/${team.id}`, { method: 'DELETE' });
  await loadTeams();
}

function openMatchModal(match?: MatchItem) {
  matchModalError.value = '';
  if (match) {
    matchForm.value = {
      id: match.id,
      homeTeamId: match.homeTeam.id,
      awayTeamId: match.awayTeam.id,
      gameMode: match.gameMode,
      scheduledAt: match.scheduledAt,
    };
  } else {
    const now = new Date(); now.setSeconds(0, 0);
    matchForm.value = {
      id: 0,
      homeTeamId: 0,
      awayTeamId: 0,
      gameMode: '3x20',
      scheduledAt: now.toISOString().slice(0, 16),
    };
  }
  matchModal.value?.showModal();
}

function closeMatchModal() {
  matchModalError.value = '';
  matchModal.value?.close();
}

async function saveMatch() {
  if (!matchForm.value.homeTeamId || !matchForm.value.awayTeamId) {
    matchModalError.value = 'Heim- und Gast-Team müssen ausgewählt sein.';
    return;
  }
  if (matchForm.value.homeTeamId === matchForm.value.awayTeamId) {
    matchModalError.value = 'Heim- und Gast-Team dürfen nicht identisch sein.';
    return;
  }
  if (!matchForm.value.scheduledAt) {
    matchModalError.value = 'Ein Spielzeitpunkt muss gesetzt werden.';
    return;
  }
  const payload = {
    homeTeamId: matchForm.value.homeTeamId,
    awayTeamId: matchForm.value.awayTeamId,
    gameMode: matchForm.value.gameMode,
    scheduledAt: matchForm.value.scheduledAt,
  };
  const method = matchForm.value.id ? 'PUT' : 'POST';
  const url = matchForm.value.id ? `/api/matches/${matchForm.value.id}` : '/api/matches';
  await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  closeMatchModal();
  await loadMatches();
}

async function deleteMatch(match: MatchItem) {
  if (!confirm('Match wirklich löschen?')) return;
  await fetch(`/api/matches/${match.id}`, { method: 'DELETE' });
  await loadMatches();
}

onMounted(async () => {
  await Promise.all([loadTeams(), loadMatches()]);
  await updateStatusBar();
});
</script>
