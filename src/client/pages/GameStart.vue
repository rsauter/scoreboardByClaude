<template>
  <div class="min-h-screen bg-base-300 flex flex-col items-center justify-center p-6">
    <div id="conn-status" class="alert alert-info py-1 px-4 text-sm mb-4 w-full max-w-2xl justify-center">{{ wsStatus }}</div>

    <h1 class="text-3xl font-bold text-primary text-center mb-1">Spielstart</h1>
    <p class="text-base-content/60 text-sm text-center mb-8">Konfiguriere das Spiel und starte dann die Uhr im Operator.</p>

    <div class="card bg-base-100 shadow-md w-full max-w-2xl mb-4">
      <div class="card-body">
        <h2 class="card-title text-xs text-base-content/50 uppercase tracking-widest mb-3">Geplantes Match</h2>
        <label class="label"><span class="label-text text-xs text-base-content/60">Auswahl</span></label>
        <select v-model.number="selectedMatchId" class="select select-bordered select-sm w-full" @change="onPlannedMatchChange">
          <option value="0">Neues Match (Recovery-Datensatz)</option>
          <option v-for="match in plannedMatches" :key="match.id" :value="match.id">
            #{{ match.id }} {{ displayTeam(match.homeTeam) }} vs {{ displayTeam(match.awayTeam) }} ({{ match.gameMode }}) - {{ formatDate(match.scheduledAt) }}
          </option>
        </select>
        <p class="text-xs text-base-content/50 mt-2">Geplante Matches werden im Manager unter "Matches" verwaltet.</p>
      </div>
    </div>

    <div class="card bg-base-100 shadow-md w-full max-w-2xl mb-4">
      <div class="card-body">
        <h2 class="card-title text-xs text-base-content/50 uppercase tracking-widest mb-3">Teams</h2>
        <div class="grid grid-cols-[1fr_40px_1fr] gap-3 items-end">
          <div class="relative" ref="homeGroup">
            <label class="label"><span class="label-text text-xs text-base-content/60">Heim-Team</span></label>
            <input type="text" v-model="cfgHome" placeholder="Teamname oder frei eingeben" autocomplete="off" @input="onTeamInput('home')" class="input input-bordered input-sm w-full">
            <div v-if="showHomeSuggestions" class="autocomplete-list shadow-lg absolute left-0 right-0 top-full mt-1 bg-base-100 rounded border border-base-content/20 z-10">
              <div v-for="team in homeSuggestions" :key="team.name" class="px-3 py-2 cursor-pointer hover:bg-base-200" @click="selectTeam('home', team.abbreviation || team.name)">{{ team.abbreviation || team.name }}</div>
            </div>
          </div>
          <div class="text-center text-base-content/40 font-bold pb-2">vs</div>
          <div class="relative" ref="awayGroup">
            <label class="label"><span class="label-text text-xs text-base-content/60">Gast-Team</span></label>
            <input type="text" v-model="cfgAway" placeholder="Teamname oder frei eingeben" autocomplete="off" @input="onTeamInput('away')" class="input input-bordered input-sm w-full">
            <div v-if="showAwaySuggestions" class="autocomplete-list shadow-lg absolute left-0 right-0 top-full mt-1 bg-base-100 rounded border border-base-content/20 z-10">
              <div v-for="team in awaySuggestions" :key="team.name" class="px-3 py-2 cursor-pointer hover:bg-base-200" @click="selectTeam('away', team.abbreviation || team.name)">{{ team.abbreviation || team.name }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="card bg-base-100 shadow-md w-full max-w-2xl mb-4">
      <div class="card-body">
        <h2 class="card-title text-xs text-base-content/50 uppercase tracking-widest mb-3">Spielmodus</h2>
        <div class="grid grid-cols-3 gap-3">
          <div>
            <label class="label"><span class="label-text text-xs">Spielmodus</span></label>
            <select v-model="cfgMode" class="select select-bordered select-sm w-full">
              <option value="1x24">1 × 24 min (E-Junioren)</option>
              <option value="2x20">2 × 20 min (Halbzeiten)</option>
              <option value="3x20">3 × 20 min (Dritteln)</option>
            </select>
          </div>
          <div>
            <label class="label"><span class="label-text text-xs">Pause</span></label>
            <select v-model.number="cfgBreak" class="select select-bordered select-sm w-full">
              <option :value="300">5 min</option>
              <option :value="600">10 min</option>
              <option :value="900">15 min</option>
            </select>
          </div>
          <div>
            <label class="label"><span class="label-text text-xs">Verlängerung</span></label>
            <select v-model.number="cfgOt" class="select select-bordered select-sm w-full">
              <option :value="300">5 min Sudden Death</option>
              <option :value="600">10 min Sudden Death</option>
            </select>
          </div>
        </div>
      </div>
    </div>

    <div class="w-full max-w-2xl">
      <button @click="startGame" class="btn btn-success btn-lg w-full">▶ Spiel starten</button>
    </div>
    <p class="text-xs text-base-content/40 mt-3 text-center">Du wirst nach dem Start zum Operator weitergeleitet.</p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { updateStatusBar } from '../shared';
import type { Team } from '../../shared/types';

interface KnownTeam {
  name: string;
  abbreviation: string;
  organization: string;
}
interface PlannedMatch {
  id: number;
  gameMode: '1x24' | '2x20' | '3x20';
  scheduledAt: string;
  homeTeam: { name: string; abbreviation: string };
  awayTeam: { name: string; abbreviation: string };
}

const wsStatus = ref('Verbinde...');
const knownTeams = ref<KnownTeam[]>([]);
const plannedMatches = ref<PlannedMatch[]>([]);
const selectedMatchId = ref(0);
const cfgHome = ref('');
const cfgAway = ref('');
const cfgMode = ref<'1x24' | '2x20' | '3x20'>('3x20');
const cfgBreak = ref(600);
const cfgOt = ref(300);
const showHomeSuggestions = ref(false);
const showAwaySuggestions = ref(false);
const homeSuggestions = ref<KnownTeam[]>([]);
const awaySuggestions = ref<KnownTeam[]>([]);
const homeGroup = ref<HTMLElement | null>(null);
const awayGroup = ref<HTMLElement | null>(null);

function wsUrl() {
  const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${location.host}/socket`;
}

function displayTeam(team: { name: string; abbreviation: string }) {
  return team.abbreviation || team.name;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('de-CH', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

async function loadTeams() {
  try {
    const res = await fetch('/api/teams');
    if (res.ok) knownTeams.value = await res.json();
  } catch {
    knownTeams.value = [];
  }
}

async function loadMatches() {
  try {
    const res = await fetch('/api/matches');
    if (res.ok) plannedMatches.value = await res.json();
  } catch {
    plannedMatches.value = [];
  }
}

function updateSuggestions(side: 'home' | 'away') {
  const value = side === 'home' ? cfgHome.value.trim().toLowerCase() : cfgAway.value.trim().toLowerCase();
  if (!value) {
    if (side === 'home') showHomeSuggestions.value = false;
    else showAwaySuggestions.value = false;
    return;
  }
  const filtered = knownTeams.value.filter(t =>
    t.name.toLowerCase().includes(value) ||
    t.abbreviation.toLowerCase().includes(value) ||
    t.organization.toLowerCase().includes(value)
  );
  if (side === 'home') {
    homeSuggestions.value = filtered;
    showHomeSuggestions.value = filtered.length > 0;
  } else {
    awaySuggestions.value = filtered;
    showAwaySuggestions.value = filtered.length > 0;
  }
}

function onTeamInput(side: 'home' | 'away') {
  updateSuggestions(side);
}

function selectTeam(side: 'home' | 'away', name: string) {
  if (side === 'home') {
    cfgHome.value = name;
    showHomeSuggestions.value = false;
  } else {
    cfgAway.value = name;
    showAwaySuggestions.value = false;
  }
}

function outsideClick(event: MouseEvent) {
  if (homeGroup.value && !homeGroup.value.contains(event.target as Node)) {
    showHomeSuggestions.value = false;
  }
  if (awayGroup.value && !awayGroup.value.contains(event.target as Node)) {
    showAwaySuggestions.value = false;
  }
}

function onPlannedMatchChange() {
  const match = plannedMatches.value.find(m => m.id === selectedMatchId.value);
  if (!match) return;
  cfgHome.value = displayTeam(match.homeTeam);
  cfgAway.value = displayTeam(match.awayTeam);
  cfgMode.value = match.gameMode;
}

function startGame() {
  const ws = new WebSocket(wsUrl());

  ws.addEventListener('open', () => {
    wsStatus.value = '🟢 Verbunden';
    ws.send(JSON.stringify({
      cmd: 'SET_CONFIG',
      homeTeam: cfgHome.value.trim() || 'Heim',
      awayTeam: cfgAway.value.trim() || 'Gast',
      gameMode: cfgMode.value,
      breakDuration: cfgBreak.value,
      otDuration: cfgOt.value,
      matchId: selectedMatchId.value || undefined,
    }));
    setTimeout(() => { window.location.href = '/operator'; }, 250);
  });
}

onMounted(async () => {
  await Promise.all([loadTeams(), loadMatches()]);
  await updateStatusBar();
  window.addEventListener('click', outsideClick);
});

onUnmounted(() => {
  window.removeEventListener('click', outsideClick);
});
</script>
