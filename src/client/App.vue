<template>
  <TopNav />
  <main class="min-h-screen bg-base-300">
    <router-view />
  </main>
</template>

<script setup lang="ts">
import TopNav from './components/TopNav.vue';
import { onMounted } from 'vue';

onMounted(() => {
  const saved = localStorage.getItem('theme') ?? 'dark';
  document.documentElement.setAttribute('data-theme', saved);
});
</script>

<style scoped>
</style>
