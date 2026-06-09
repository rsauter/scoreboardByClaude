<template>
  <div class="bg-base-300 p-4 min-h-screen">
    <div id="conn-status" class="alert alert-info py-1 px-4 text-sm mb-4 justify-center">{{ statusText }}</div>

    <div class="flex items-center justify-between mb-5">
      <h1 class="text-2xl font-bold text-primary">📊 Match Übersicht</h1>
      <button @click="loadDashboard" class="btn btn-square btn-ghost btn-sm" title="Aktualisieren">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
      </button>
    </div>

    <div class="space-y-4">
      <div v-if="loading" class="flex justify-center items-center py-20">
        <span class="loading loading-spinner loading-lg text-primary"></span>
      </div>

      <div v-if="error" class="alert alert-error shadow-lg">
        <span>{{ error }}</span>
      </div>

      <div v-if="!loading && matches.length === 0" class="card bg-base-200 shadow-xl p-10 text-center">
        <h2 class="text-xl font-bold mb-2">Keine Matches gefunden</h2>
        <p class="text-base-content/60 mb-4">Es sind keine geplanten oder laufenden Spiele erfasst.</p>
        <a href="/manager" class="btn btn-primary">Zum Manager</a>
      </div>

      <div v-for="match in matches" :key="match.id" :class="['card bg-base-200 shadow-md hover:shadow-xl transition-all duration-200 border-l-4', statusBorder(match.status)]">
        <div class="card-body p-5">
          <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div class="flex-1">
              <div class="flex items-center gap-3 mb-1">
                <span :class="['status-dot', statusClass(match.status)]"></span>
                <h2 class="card-title text-xl">
                  {{ match.homeTeam }} <span class="text-base-content/40 mx-1">vs</span> {{ match.awayTeam }}
                </h2>
                <div :class="['badge', statusBadge(match.status), 'badge-outline', 'font-bold']">{{ statusLabel(match.status) }}</div>
              </div>
              <div class="text-sm text-base-content/60 flex flex-wrap gap-4 mt-2">
                <span>📅 {{ formatDate(match.scheduledAt) }}</span>
                <span>🏆 Phase: <span class="font-mono">{{ match.phase }}</span></span>
                <span>🎯 Score: <span class="font-bold text-base-content">{{ match.homeScore }}:{{ match.awayScore }}</span></span>
              </div>
            </div>

            <div class="flex gap-2 w-full md:w-auto">
              <a :href="match.status === 'planned' ? '/gamestart' : '/operator'" class="btn btn-primary btn-sm flex-1 md:flex-none">
                {{ match.status === 'planned' ? 'Starten' : 'Steuerung' }}
              </a>
              <a href="/display.html" target="_blank" class="btn btn-secondary btn-sm flex-1 md:flex-none">Display</a>
              <a href="/manager" class="btn btn-ghost btn-sm flex-1 md:flex-none">Manager</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { updateStatusBar } from '../shared';
import type { GameMode } from '../../shared/types';

interface MatchData {
  id: number;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  phase: string;
  scheduledAt: string;
  status: 'ok' | 'warn' | 'crash' | 'planned';
  lastUpdate: number;
}

const matches = ref<MatchData[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);
const statusText = ref('Lade Dashboard...');
let refreshTimer: number | undefined;

function statusLabel(status: MatchData['status']) {
  switch (status) {
    case 'ok': return 'LIVE';
    case 'warn': return 'VERZÖGERT';
    case 'crash': return 'KEIN SIGNAL';
    case 'planned': return 'GEPLANT';
    default: return 'UNBEKANNT';
  }
}

function statusClass(status: MatchData['status']) {
  switch (status) {
    case 'ok': return 'bg-live';
    case 'warn': return 'bg-warn';
    case 'crash': return 'bg-crash';
    case 'planned': return 'bg-planned';
    default: return 'bg-gray-500';
  }
}

function statusBadge(status: MatchData['status']) {
  switch (status) {
    case 'ok': return 'badge-success';
    case 'warn': return 'badge-warning';
    case 'crash': return 'badge-error';
    case 'planned': return 'badge-info';
    default: return 'badge-ghost';
  }
}

function statusBorder(status: MatchData['status']) {
  switch (status) {
    case 'ok': return 'border-success';
    case 'warn': return 'border-warning';
    case 'crash': return 'border-error';
    case 'planned': return 'border-info';
    default: return 'border-gray-500';
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('de-CH', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', year: 'numeric'
  });
}

async function loadDashboard() {
  loading.value = true;
  error.value = null;
  statusText.value = 'Lade Dashboard...';

  try {
    const res = await fetch('/api/dashboard');
    if (!res.ok) throw new Error('Fehler beim Laden der Dashboard-Daten');
    matches.value = await res.json();
  } catch (err) {
    console.error(err);
    error.value = 'Fehler beim Laden der Dashboard-Daten. Server erreichbar?';
  } finally {
    loading.value = false;
    updateStatusBar();
  }
}

onMounted(() => {
  loadDashboard();
  refreshTimer = window.setInterval(loadDashboard, 5000);
});

onUnmounted(() => {
  if (refreshTimer !== undefined) {
    window.clearInterval(refreshTimer);
  }
});
</script>
