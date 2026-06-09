<template>
  <div>
    <div class="timeout-banner" v-if="state?.timeoutActive">⏱ TIMEOUT {{ timeoutTeam }} – {{ fmt(state.timeoutRemaining) }}</div>
    <div class="conn-dot">{{ wsStatus }}</div>
    <div class="phase" v-text="state?.phase ? phaseLabel(state) : '---'"></div>

    <div class="scoreboard">
      <div class="team">
        <div class="team-name" v-text="state?.homeTeam || 'HEIM'"></div>
        <div class="team-score home-score" v-text="state?.homeScore ?? 0"></div>
      </div>
      <div class="divider">:</div>
      <div class="team">
        <div class="team-name" v-text="state?.awayTeam || 'GAST'"></div>
        <div class="team-score away-score" v-text="state?.awayScore ?? 0"></div>
      </div>
    </div>

    <div class="clock" :class="clockClass" v-text="state ? fmt(state.timeRemaining) : '20:00'"></div>
    <div class="game-status-bullet" :class="bulletClass"></div>

    <div class="penalties">
      <div class="pen-side">
        <div class="pen-title">Strafen {{ state?.homeTeam || 'Heim' }}</div>
        <div v-for="pen in homePenalties" :key="pen.id" class="pen-item">
          <span class="pen-num">#{{ pen.player || '?' }}</span>
          <span class="pen-rem" v-text="fmt(pen.remaining)"></span>
        </div>
      </div>
      <div class="pen-side">
        <div class="pen-title">Strafen {{ state?.awayTeam || 'Gast' }}</div>
        <div v-for="pen in awayPenalties" :key="pen.id" class="pen-item">
          <span class="pen-num">#{{ pen.player || '?' }}</span>
          <span class="pen-rem" v-text="fmt(pen.remaining)"></span>
        </div>
      </div>
    </div>

    <div class="shootout-row" v-if="state?.phase === 'shootout'">
      <div class="so-box">
        <div class="so-label" v-text="state?.homeTeam || 'Heim'"></div>
        <div class="text-6xl" v-text="state?.homeShootout ?? 0"></div>
      </div>
      <div class="so-box">
        <div class="so-label" v-text="state?.awayTeam || 'Gast'"></div>
        <div class="text-6xl" v-text="state?.awayShootout ?? 0"></div>
      </div>
    </div>

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
  if (!state.value) return 'clock';
  if (state.value.phase === 'ended') return 'clock ended';
  if (state.value.phase === 'break') return 'clock break';
  if (state.value.running) return 'clock running';
  return 'clock paused';
});

const bulletClass = computed(() => {
  if (!state.value) return 'game-status-bullet inactive';
  if (state.value.phase === 'ended' || state.value.phase === 'pregame') return 'game-status-bullet inactive';
  if (state.value.timeoutActive) return 'game-status-bullet timeout';
  if (state.value.running) return 'game-status-bullet running';
  return 'game-status-bullet stopped';
});

const timeoutTeam = computed(() => state.value?.timeoutActive === 'home' ? state.value.homeTeam : state.value?.timeoutActive === 'away' ? state.value.awayTeam : '');
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

onMounted(() => {
  connectWebSocket();
});

onUnmounted(() => {
  ws?.close();
});
</script>
