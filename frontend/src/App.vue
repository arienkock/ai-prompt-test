<template>
  <div id="app">
    <RouterView />
  </div>
</template>

<script setup lang="ts">
import { RouterView } from 'vue-router';
</script>

<style>
/* Global styles */
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  line-height: 1.6;
  color: #333;
}

#app {
  min-height: 100vh;
}

/* Global button reset */
button {
  font-family: inherit;
}

/* Global link styles */
a {
  color: inherit;
  text-decoration: none;
}

/* Global form styles */
input, button, select, textarea {
  font-family: inherit;
  font-size: inherit;
}
</style>
