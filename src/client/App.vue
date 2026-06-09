<template>
  <TopNav />
  <main class="min-h-screen bg-base-300">
    <router-view />
  </main>
</template>

<script setup lang="ts">
import TopNav from './components/TopNav.vue';
</script>

<style scoped>
</style>
