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
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router';
const route = useRoute();
</script>

<style scoped>
</style>
