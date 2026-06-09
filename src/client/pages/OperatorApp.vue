<template>
  <div class="bg-base-300 p-4 min-h-screen">
    <h1 class="text-2xl font-bold text-primary text-center mb-3">⏱ Matchuhr – Operator</h1>
    <div id="conn-status" class="alert alert-info py-1 px-4 text-sm mb-4 justify-center">{{ wsStatus }}</div>

    <div class="grid grid-cols-2 gap-3">
      <div class="card bg-base-100 shadow col-span-2">
        <div class="card-body py-3 px-4">
          <h2 class="text-xs text-base-content/50 uppercase tracking-widest mb-2">Spielzeit</h2>
          <input
            ref="clockInputEl"
            type="text"
            class="clock-display text-5xl font-bold text-primary text-center w-full bg-transparent border-0 outline-none cursor-default"
            :class="{ 'cursor-text border-b-2 border-primary/40': showTimeAdjust }"
            v-model="clockDisplayValue"
            :disabled="!showTimeAdjust"
            @keyup.enter="onClockEnter"
            title="Zeit direkt eingeben (MM:SS) wenn Uhr gestoppt"
          />
          <div class="text-center text-xs text-base-content/30 my-0.5" v-if="showTimeAdjust">MM:SS eingeben · Enter zum Übernehmen</div>
          <div class="text-center text-sm text-base-content/50 my-1">{{ phaseLabelText }}</div>

          <div class="flex items-center justify-center gap-3 my-1" v-if="showTimeAdjust">
            <span class="text-xs text-base-content/40">Feinkorrektur</span>
            <button @click="adjustTime(-1)" title="−1 Sekunde" class="btn-adjust btn btn-sm btn-ghost border border-base-content/20 text-primary">−</button>
            <button @click="adjustTime(1)" title="+1 Sekunde" class="btn-adjust btn btn-sm btn-ghost border border-base-content/20 text-primary">+</button>
          </div>

          <div class="flex flex-wrap gap-2 justify-center mt-2">
            <button @click="sendCmd('START')" class="btn btn-success btn-sm">▶ Start</button>
            <button @click="sendCmd('STOP')" class="btn btn-error btn-sm">⏸ Stop</button>
            <button @click="sendCmd('NEXT_PHASE')" class="btn btn-warning btn-sm">⏭ Nächste Phase</button>
            <button @click="confirmReset" class="btn btn-ghost btn-sm">🔄 Reset</button>
          </div>
        </div>
      </div>

      <div class="card bg-base-100 shadow">
        <div class="card-body py-3 px-4">
          <h2 class="text-xs text-base-content/50 uppercase tracking-widest mb-3">Spielstand</h2>
          <div class="flex items-center justify-around">
            <div class="text-center">
              <div class="text-sm text-base-content/50" v-text="gameState?.homeTeam || 'Heim'"></div>
              <div class="text-5xl font-bold" v-text="gameState?.homeScore ?? 0"></div>
              <div class="flex gap-2 mt-1">
                <button @click="sendCmd('GOAL_HOME')" class="btn btn-success btn-xs">+1</button>
                <button @click="sendCmd('UNDO_HOME')" class="btn btn-ghost btn-xs">−1</button>
              </div>
            </div>
            <div class="text-2xl text-base-content/30">:</div>
            <div class="text-center">
              <div class="text-sm text-base-content/50" v-text="gameState?.awayTeam || 'Gast'"></div>
              <div class="text-5xl font-bold" v-text="gameState?.awayScore ?? 0"></div>
              <div class="flex gap-2 mt-1">
                <button @click="sendCmd('GOAL_AWAY')" class="btn btn-success btn-xs">+1</button>
                <button @click="sendCmd('UNDO_AWAY')" class="btn btn-ghost btn-xs">−1</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="card bg-base-100 shadow">
        <div class="card-body py-3 px-4">
          <h2 class="text-xs text-base-content/50 uppercase tracking-widest mb-3">Timeout (30 Sek.)</h2>
          <div class="flex items-center justify-around">
            <div class="text-center">
              <div class="text-sm mb-1" v-text="gameState?.homeTeam || 'Heim'"></div>
              <button id="btn-to-home" @click="sendCmd('TIMEOUT', { team: 'home' })" class="btn btn-warning btn-sm" :disabled="timeoutButtonDisabled('home')">TO Heim</button>
              <div class="text-xs text-base-content/40 mt-1" v-text="homeTimeoutLabel"></div>
            </div>
            <div class="text-3xl font-bold text-warning" v-if="gameState?.timeoutActive" v-text="formattedTimeoutRemaining"></div>
            <div class="text-center">
              <div class="text-sm mb-1" v-text="gameState?.awayTeam || 'Gast'"></div>
              <button id="btn-to-away" @click="sendCmd('TIMEOUT', { team: 'away' })" class="btn btn-warning btn-sm" :disabled="timeoutButtonDisabled('away')">TO Gast</button>
              <div class="text-xs text-base-content/40 mt-1" v-text="awayTimeoutLabel"></div>
            </div>
          </div>
        </div>
      </div>

      <div class="card bg-base-100 shadow col-span-2">
        <div class="card-body py-3 px-4">
          <h2 class="text-xs text-base-content/50 uppercase tracking-widest mb-3">Strafen</h2>
          <div class="grid grid-cols-3 gap-2 mb-3">
            <div>
              <label class="label py-0"><span class="label-text text-xs">Team</span></label>
              <select id="pen-team" v-model="penalty.team" class="select select-bordered select-sm w-full">
                <option value="home">Heim</option>
                <option value="away">Gast</option>
              </select>
            </div>
            <div>
              <label class="label py-0"><span class="label-text text-xs">Spieler #</span></label>
              <input type="text" v-model="penalty.player" placeholder="z.B. 7" class="input input-bordered input-sm w-full">
            </div>
            <div>
              <label class="label py-0"><span class="label-text text-xs">Dauer</span></label>
              <select id="pen-duration" v-model.number="penalty.duration" class="select select-bordered select-sm w-full">
                <option :value="120">2 min</option>
                <option :value="300">5 min</option>
                <option :value="600">10 min</option>
              </select>
            </div>
          </div>
          <button @click="addPenalty" class="btn btn-error btn-sm">➕ Strafe erfassen</button>
          <ul class="mt-3 space-y-1 list-none">
            <li v-for="pen in gameState?.penalties || []" :key="pen.id" class="flex justify-between items-center bg-base-200 rounded px-3 py-1 text-sm">
              <span>{{ penaltyLabel(pen) }}</span>
              <span class="font-bold text-error">{{ formatTime(pen.remaining) }}</span>
              <button class="btn btn-ghost btn-xs" @click="removePenalty(pen.id)">✕</button>
            </li>
          </ul>
        </div>
      </div>

      <div class="card bg-base-100 shadow col-span-2" v-if="gameState?.phase === 'shootout'">
        <div class="card-body py-3 px-4">
          <h2 class="text-xs text-base-content/50 uppercase tracking-widest mb-3">Penalty / Shootout</h2>
          <div class="grid grid-cols-2 gap-4 text-center">
            <div>
              <div class="text-sm mb-1" v-text="gameState?.homeTeam"></div>
              <div class="text-4xl font-bold text-pink-400" v-text="gameState?.homeShootout"></div>
              <button @click="sendCmd('SO_HOME')" class="btn btn-success btn-sm mt-2">Tor ✓</button>
            </div>
            <div>
              <div class="text-sm mb-1" v-text="gameState?.awayTeam"></div>
              <div class="text-4xl font-bold text-pink-400" v-text="gameState?.awayShootout"></div>
              <button @click="sendCmd('SO_AWAY')" class="btn btn-success btn-sm mt-2">Tor ✓</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { fmt, phaseLabel, updateStatusBar } from '../shared';
import type { GameState, ClientCommand } from '../../shared/types';

const wsStatus = ref('Verbinde...');
const gameState = ref<GameState | null>(null);
const penalty = ref({ team: 'home' as 'home' | 'away', player: '', duration: 120 });
const clockDisplayValue = ref('');
const clockInputEl = ref<HTMLInputElement | null>(null);
let ws: WebSocket | null = null;

function wsUrl() {
  const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${location.host}/socket`;
}

const formattedTime = computed(() => formatTime(gameState.value?.timeRemaining ?? 0));
const phaseLabelText = computed(() => gameState.value ? phaseLabel(gameState.value) : '–');
const showTimeAdjust = computed(() => {
  if (!gameState.value) return false;
  return !gameState.value.running && !gameState.value.timeoutActive && ['period', 'overtime'].includes(gameState.value.phase);
});
const homeTimeoutLabel = computed(() => `TO verfügbar: ${gameState.value?.homeTimeouts ?? 0}`);
const awayTimeoutLabel = computed(() => `TO verfügbar: ${gameState.value?.awayTimeouts ?? 0}`);
const formattedTimeoutRemaining = computed(() => formatTime(gameState.value?.timeoutRemaining ?? 0));

function formatTime(seconds: number) {
  return fmt(seconds);
}

function penaltyLabel(pen: { team: 'home' | 'away'; player: string; duration: number; remaining: number }) {
  return `${pen.team === 'home' ? gameState.value?.homeTeam : gameState.value?.awayTeam} #${pen.player || '?'} – ${Math.floor(pen.duration / 60)} min`;
}

function timeoutButtonDisabled(team: 'home' | 'away') {
  return !gameState.value || !!gameState.value.timeoutActive || (team === 'home' ? gameState.value.homeTimeouts === 0 : gameState.value.awayTimeouts === 0);
}

function connectWebSocket() {
  ws = new WebSocket(wsUrl());
  ws.addEventListener('open', () => {
    wsStatus.value = '🟢 Verbunden';
    updateStatusBar(wsStatus.value);
  });
  ws.addEventListener('close', () => {
    wsStatus.value = '🔴 Getrennt – Seite neu laden';
    updateStatusBar(wsStatus.value);
  });
  ws.addEventListener('message', event => {
    const message = JSON.parse(event.data) as { type: string; state?: GameState; reason?: string };
    if (message.type === 'STATE' && message.state) {
      // Nur updaten wenn der Clock-Input gerade nicht fokussiert ist
      gameState.value = message.state;
      if (document.activeElement !== clockInputEl.value) {
        clockDisplayValue.value = formatTime(message.state.timeRemaining);
      }
    }
    if (message.type === 'BUZZER' && message.reason) {
      playBuzzer(message.reason);
    }
  });
}

function sendCmd(cmd: ClientCommand['cmd'], extra: Partial<ClientCommand> = {}) {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  ws.send(JSON.stringify({ cmd, ...extra }));
}

function adjustTime(delta: number) {
  sendCmd('ADJUST_TIME', { delta } as any);
}

function parseTimeInput(raw: string): number | null {
  const s = raw.trim();
  if (s.includes(':')) {
    const [mm, ss] = s.split(':').map(Number);
    if (!isNaN(mm) && !isNaN(ss)) return mm * 60 + ss;
  } else {
    const n = parseInt(s);
    if (!isNaN(n)) return n;
  }
  return null;
}

function onClockEnter(e: KeyboardEvent) {
  const seconds = parseTimeInput(clockDisplayValue.value);
  if (seconds !== null && seconds >= 0) {
    clockDisplayValue.value = formatTime(seconds);
    sendCmd('SET_TIME', { seconds } as any);
  } else {
    clockDisplayValue.value = formattedTime.value;
  }
  (e.target as HTMLInputElement).blur();
}

function addPenalty() {
  if (!penalty.value.player.trim()) return;
  sendCmd('ADD_PENALTY', {
    team: penalty.value.team,
    player: penalty.value.player.trim(),
    duration: penalty.value.duration,
  } as any);
  penalty.value.player = '';
}

function removePenalty(id: number) {
  sendCmd('REMOVE_PENALTY', { id } as any);
}

function confirmReset() {
  if (!confirm('Spiel wirklich zurücksetzen? Du wirst zu Spielstart weitergeleitet.')) return;
  sendCmd('RESET');
  setTimeout(() => { window.location.href = '/gamestart'; }, 200);
}

function playBuzzer(reason: string) {
  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.connect(g); g.connect(ctx.destination);
  if (reason === 'period') { o.frequency.value = 220; g.gain.value = 0.8; }
  else if (reason === 'timeout') { o.frequency.value = 660; g.gain.value = 0.5; }
  else { o.frequency.value = 440; g.gain.value = 0.4; }
  o.start();
  const dur = reason === 'period' ? 1.5 : 0.6;
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
  o.stop(ctx.currentTime + dur);
}

onMounted(() => {
  connectWebSocket();
  updateStatusBar();
  clockDisplayValue.value = formattedTime.value;
});

onUnmounted(() => {
  ws?.close();
});
</script>