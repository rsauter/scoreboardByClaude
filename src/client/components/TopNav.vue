<template>
  <header class="bg-base-200 border-b border-base-300 shadow-sm">
    <div class="mx-auto flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between max-w-7xl">
      <div class="flex flex-wrap items-center gap-2">
        <span class="text-lg font-bold text-primary">Matchuhr</span>
        <nav class="flex flex-wrap gap-2">
          <RouterLink to="/" class="btn btn-ghost btn-sm" :class="{ 'btn-active': route.name === 'Dashboard' }">Dashboard</RouterLink>
          <RouterLink to="/manager" class="btn btn-ghost btn-sm" :class="{ 'btn-active': route.name === 'Manager' }">Manager</RouterLink>
          <RouterLink to="/gamestart" class="btn btn-ghost btn-sm" :class="{ 'btn-active': route.name === 'GameStart' }">Spielstart</RouterLink>
          <RouterLink to="/operator" class="btn btn-ghost btn-sm" :class="{ 'btn-active': route.name === 'Operator' }">Operator</RouterLink>
        </nav>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <a href="/display.html" target="_blank" class="btn btn-outline btn-sm">Display</a>
        <span class="text-xs text-base-content/60">Standalone Anzeige</span>

        <!-- Theme Selector -->
        <details class="dropdown dropdown-end">
          <summary class="btn btn-ghost btn-sm">🎨 {{ currentTheme }}</summary>
          <ul class="dropdown-content menu bg-base-200 rounded-box z-50 w-44 p-2 shadow-lg max-h-80 overflow-y-auto flex-nowrap">
            <li v-for="t in themes" :key="t">
              <a :class="{ active: currentTheme === t }" @click="setTheme(t)">{{ t }}</a>
            </li>
          </ul>
        </details>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router';
import { ref } from 'vue';

const route = useRoute();

const themes = [
  'light', 'dark', 'cupcake', 'emerald', 'corporate', 'synthwave',
  'retro', 'cyberpunk', 'halloween', 'forest', 'aqua', 'lofi',
  'black', 'luxury', 'dracula', 'autumn', 'business', 'night',
  'coffee', 'winter', 'dim', 'nord', 'sunset',
];

const currentTheme = ref(localStorage.getItem('theme') ?? 'dark');

function setTheme(theme: string) {
  currentTheme.value = theme;
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
}
</script>

<style scoped>
</style>