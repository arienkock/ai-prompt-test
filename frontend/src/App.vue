<template>
  <div class="app">
    <header class="header">
      <h1>🚀 AI Rules Test Application</h1>
      <p class="subtitle">Layered Architecture with Vue.js + Express + TypeScript</p>
    </header>
    
    <main class="main">
      <div class="card">
        <h2>🏗️ Architecture Layers</h2>
        <div class="layers">
          <div class="layer">
            <h3>Domain Layer</h3>
            <p>Entities, Use Cases, Repository Interfaces</p>
          </div>
          <div class="layer">
            <h3>Data Access Layer</h3>
            <p>Repository Implementations, Migrations, Database Config</p>
          </div>
          <div class="layer">
            <h3>Web Controller Layer</h3>
            <p>Express Routes, Middleware, HTTP Handling</p>
          </div>
          <div class="layer">
            <h3>UI Layer</h3>
            <p>Vue.js Components, API Client, Frontend Logic</p>
          </div>
        </div>
      </div>

      <div class="card">
        <h2>🛠️ Tech Stack</h2>
        <ul class="tech-list">
          <li>Frontend: Vue.js 3 + TypeScript + Vite</li>
          <li>Backend: Express.js + TypeScript</li>
          <li>Database: PostgreSQL + Prisma ORM</li>
          <li>Architecture: Clean Architecture + DDD</li>
        </ul>
      </div>

      <div class="card">
        <h2>✅ Integration Status</h2>
        <p class="status success">Frontend and Backend successfully integrated!</p>
        <p class="info">This page is served by the Express backend with Vue.js frontend.</p>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
// Landing page component - no logic needed for now
</script>

<style scoped>
.app {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
}

.header {
  text-align: center;
  margin-bottom: 3rem;
}

.header h1 {
  font-size: 2.5rem;
  margin-bottom: 0.5rem;
  background: linear-gradient(45deg, #42b883, #35495e);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.subtitle {
  font-size: 1.1rem;
  color: #666;
  margin: 0;
}

.main {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.card {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 2rem;
  border: 1px solid #e9ecef;
}

.card h2 {
  margin-top: 0;
  color: #35495e;
}

.layers {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
}

.layer {
  background: white;
  padding: 1rem;
  border-radius: 4px;
  border-left: 4px solid #42b883;
}

.layer h3 {
  margin: 0 0 0.5rem 0;
  color: #35495e;
  font-size: 1rem;
}

.layer p {
  margin: 0;
  font-size: 0.9rem;
  color: #666;
}

.tech-list {
  list-style: none;
  padding: 0;
}

.tech-list li {
  background: white;
  padding: 0.75rem;
  margin: 0.5rem 0;
  border-radius: 4px;
  border-left: 4px solid #35495e;
}

.status {
  font-weight: bold;
  padding: 1rem;
  border-radius: 4px;
  margin: 1rem 0;
}

.status.success {
  background: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
}

.info {
  color: #666;
  font-style: italic;
  margin: 0;
}
</style>
