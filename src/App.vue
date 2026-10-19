<template>
  <div>
    <p class="construction-note">🚧 Under construction</p>
    <nav class="app-nav" aria-label="Main navigation">
      <RouterLink to="/">Today</RouterLink>
      <RouterLink
        to="/timeline"
        :aria-current="$route.path.startsWith('/timeline') ? 'page' : undefined"
      >
        Timeline
      </RouterLink>
      <RouterLink to="/tags">Tags</RouterLink>
    </nav>
    <router-view />
  </div>
</template>

<script setup lang="ts">
import { RouterLink } from "vue-router";
</script>

<style scoped>
.construction-note {
  margin: 0;
  padding: 6px 12px;
  text-align: center;
  font-size: 0.85em;
  color: var(--color-warning);
  background-color: var(--color-warning-background);
  border-bottom: 1px solid var(--color-warning-border);
}
.app-nav {
  position: sticky;
  z-index: 20;
  top: 0;
  display: flex;
  gap: 16px;
  padding: 10px 20px;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-page);
}
.app-nav a {
  min-height: 44px;
  display: inline-flex;
  align-items: center;
}
.app-nav a.router-link-active {
  font-weight: 700;
}
</style>
