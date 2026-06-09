import { createRouter, createWebHistory } from 'vue-router';

const routes = [
  { path: '/', name: 'Dashboard', component: () => import('../pages/Dashboard.vue') },
  { path: '/manager', name: 'Manager', component: () => import('../pages/ManagerApp.vue') },
  { path: '/gamestart', name: 'GameStart', component: () => import('../pages/GameStart.vue') },
  { path: '/operator', name: 'Operator', component: () => import('../pages/OperatorApp.vue') },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
