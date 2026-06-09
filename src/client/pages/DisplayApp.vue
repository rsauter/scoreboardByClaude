<template>
  <div class="board-outer" :style="{ '--home-color': state?.homeColor || '#c0392b', '--away-color': state?.awayColor || '#2980b9' }">
    <div class="conn-dot">{{ wsStatus }}</div>

    <!-- Header-Zeile -->
    <div class="header-row">
      <div class="home-header">
        <span class="team-name">{{ state?.homeAbbr || state?.homeTeam || 'Heim' }}</span>
      </div>
      <div class="clock-area">
        <div class="status-bullet" :class="bulletClass"></div>
        <div class="clock" :class="clockClass">{{ state ? fmt(state.timeRemaining) : '20:00' }}</div>
      </div>
      <div class="away-header">
        <span class="team-name">{{ state?.awayAbbr || state?.awayTeam || 'Gast' }}</span>
      </div>
    </div>

    <!-- Score-Zeile -->
    <div class="score-row">

      <!-- Heim Score + Strafen -->
      <div class="home-score-area">
        <span class="score-digit">{{ state?.homeScore ?? 0 }}</span>
        <div class="pen-box">
          <div class="pen-header">— Strafen —</div>
          <div v-if="homePenalties.length === 0" class="pen-empty">–</div>
          <div v-for="pen in homePenalties" :key="pen.id" class="pen-item">
            <span class="pen-num">#{{ pen.player || '?' }}</span>
            <span class="pen-rem">{{ fmt(pen.remaining) }}</span>
          </div>
        </div>
      </div>

      <!-- Mitte: Timeout / Shootout -->
      <div class="score-center">
        <div class="timeout-box" :class="{ active: state?.timeoutActive }">
          <div class="timeout-label">▶▶ Timeout ⏱</div>
          <div class="timeout-info">{{ timeoutTeam }} – {{ state ? fmt(state.timeoutRemaining) : '' }}</div>
        </div>
        <div class="shootout-box" v-if="state?.phase === 'shootout' && !state?.timeoutActive">
          <div class="so-label">Shootout</div>
          <div class="so-scores">{{ state?.homeShootout ?? 0 }} : {{ state?.awayShootout ?? 0 }}</div>
        </div>
      </div>

      <!-- Gast Score + Strafen -->
      <div class="away-score-area">
        <span class="score-digit">{{ state?.awayScore ?? 0 }}</span>
        <div class="pen-box">
          <div class="pen-header">— Strafen —</div>
          <div v-if="awayPenalties.length === 0" class="pen-empty">–</div>
          <div v-for="pen in awayPenalties" :key="pen.id" class="pen-item">
            <span class="pen-num">#{{ pen.player || '?' }}</span>
            <span class="pen-rem">{{ fmt(pen.remaining) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Phase-Bar -->
    <div class="phase-row">
      <span class="phase-label">{{ state?.phase ? phaseLabel(state) : '---' }}</span>
    </div>

    <!-- Spiel beendet -->
    <div class="ended-banner" v-if="state?.phase === 'ended'">SPIEL BEENDET</div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { fmt, phaseLabel } from '../shared';
import type { GameState } from '../../shared/types';

const wsStatus = ref('⚫');
const state = ref<GameState | null>(null);
let ws: WebSocket | null = null;

function wsUrl() {
  const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${location.host}/socket`;
}

const clockClass = computed(() => {
  if (!state.value) return '';
  if (state.value.phase === 'ended') return 'ended';
  if (state.value.phase === 'break') return 'break';
  if (state.value.running) return 'running';
  return 'paused';
});

const bulletClass = computed(() => {
  if (!state.value) return 'inactive';
  if (state.value.phase === 'ended' || state.value.phase === 'pregame') return 'inactive';
  if (state.value.timeoutActive) return 'timeout';
  if (state.value.running) return 'running';
  return 'stopped';
});

const timeoutTeam = computed(() =>
  state.value?.timeoutActive === 'home' ? state.value.homeTeam
  : state.value?.timeoutActive === 'away' ? state.value.awayTeam : ''
);
const homePenalties = computed(() => state.value?.penalties.filter(p => p.team === 'home') ?? []);
const awayPenalties = computed(() => state.value?.penalties.filter(p => p.team === 'away') ?? []);

function connectWebSocket() {
  ws = new WebSocket(wsUrl());
  ws.addEventListener('open', () => { wsStatus.value = '🟢'; });
  ws.addEventListener('close', () => { wsStatus.value = '🔴'; });
  ws.addEventListener('message', (event) => {
    const message = JSON.parse(event.data) as { type: string; state?: GameState };
    if (message.type === 'STATE' && message.state) {
      state.value = message.state;
    }
  });
}

onMounted(() => { connectWebSocket(); });
onUnmounted(() => { ws?.close(); });
</script>