<template>
  <div class="home-container">
    <nav class="navbar">
      <div class="nav-brand">
        <h2>🚀 AI Rules Test</h2>
      </div>
      <div class="nav-links">
        <template v-if="isAuthenticated">
          <router-link to="/dashboard" class="nav-link primary">
            Dashboard
          </router-link>
          <button @click="handleLogout" class="nav-link logout" :disabled="isLoading">
            {{ isLoading ? 'Signing out...' : 'Sign Out' }}
          </button>
        </template>
        <template v-else>
          <router-link to="/login" class="nav-link">
            Sign In
          </router-link>
          <router-link to="/register" class="nav-link primary">
            Sign Up
          </router-link>
        </template>
      </div>
    </nav>

    <main class="main-content">
      <div class="hero-section">
        <h1 class="hero-title">Welcome to AI Rules Test</h1>
        <p class="hero-subtitle">
          A layered architecture demonstration with Vue.js + Express + TypeScript
        </p>
        
        <div class="hero-actions" v-if="!isAuthenticated">
          <router-link to="/register" class="btn btn-primary">
            Get Started
          </router-link>
          <router-link to="/login" class="btn btn-secondary">
            Sign In
          </router-link>
        </div>
        
        <div class="hero-actions" v-else>
          <router-link to="/dashboard" class="btn btn-primary">
            Go to Dashboard
          </router-link>
        </div>
      </div>

      <div class="features-section">
        <div class="feature-grid">
          <div class="feature-card">
            <h3>🏗️ Clean Architecture</h3>
            <p>Built with Domain-Driven Design principles and layered architecture patterns.</p>
            <div class="layers">
              <div class="layer">Domain Layer</div>
              <div class="layer">Data Access Layer</div>
              <div class="layer">Web Controller Layer</div>
              <div class="layer">UI Layer</div>
            </div>
          </div>

          <div class="feature-card">
            <h3>🔐 Authentication System</h3>
            <p>Complete user authentication with JWT tokens, route protection, and secure session management.</p>
            <div class="auth-features">
              <div class="auth-feature">✅ User Registration</div>
              <div class="auth-feature">✅ User Login</div>
              <div class="auth-feature">✅ Protected Routes</div>
              <div class="auth-feature">✅ Token Management</div>
            </div>
          </div>

          <div class="feature-card">
            <h3>🛠️ Tech Stack</h3>
            <p>Modern technologies working together for optimal developer experience and performance.</p>
            <div class="tech-stack">
              <div class="tech-item">Frontend: Vue.js 3 + TypeScript</div>
              <div class="tech-item">Backend: Express.js + TypeScript</div>
              <div class="tech-item">Database: PostgreSQL</div>
              <div class="tech-item">Authentication: JWT</div>
            </div>
          </div>

          <div class="feature-card">
            <h3>✅ Integration Status</h3>
            <p>Frontend and backend successfully integrated with full authentication flow.</p>
            <div class="status-indicators">
              <div class="status-item success">
                <span class="status-icon">✅</span>
                <span>API Integration</span>
              </div>
              <div class="status-item success">
                <span class="status-icon">✅</span>
                <span>Authentication Flow</span>
              </div>
              <div class="status-item success">
                <span class="status-icon">✅</span>
                <span>Route Protection</span>
              </div>
              <div class="status-item success">
                <span class="status-icon">✅</span>
                <span>Form Validation</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>

    <footer class="footer">
      <p>&copy; 2025 AI Rules Test Application. Built with Vue.js and Express.js.</p>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useAuth } from '../composables/useAuth';

const router = useRouter();
const { isAuthenticated, isLoading, logout } = useAuth();

const handleLogout = async () => {
  try {
    await logout();
    router.push('/login');
  } catch (err) {
    console.error('Logout failed:', err);
    // Still redirect even if logout API fails
    router.push('/login');
  }
};
</script>

<style scoped>
.home-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.navbar {
  background: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  padding: 1rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: sticky;
  top: 0;
  z-index: 100;
}

.nav-brand h2 {
  margin: 0;
  background: linear-gradient(45deg, #42b883, #35495e);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.nav-links {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.nav-link {
  padding: 0.5rem 1rem;
  text-decoration: none;
  border-radius: 6px;
  font-weight: 500;
  transition: all 0.2s;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 1rem;
}

.nav-link:not(.primary):not(.logout) {
  color: #374151;
}

.nav-link:not(.primary):not(.logout):hover {
  background: #f3f4f6;
  color: #1f2937;
}

.nav-link.primary {
  background: #667eea;
  color: white;
}

.nav-link.primary:hover {
  background: #5a67d8;
}

.nav-link.logout {
  color: #dc2626;
}

.nav-link.logout:hover:not(:disabled) {
  background: #fee2e2;
}

.nav-link:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.main-content {
  flex: 1;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.hero-section {
  padding: 4rem 2rem;
  text-align: center;
  color: white;
}

.hero-title {
  font-size: 3.5rem;
  font-weight: bold;
  margin-bottom: 1rem;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.hero-subtitle {
  font-size: 1.25rem;
  margin-bottom: 2rem;
  opacity: 0.9;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
}

.hero-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
}

.btn {
  padding: 1rem 2rem;
  text-decoration: none;
  border-radius: 8px;
  font-weight: 500;
  transition: all 0.2s;
  font-size: 1rem;
  display: inline-block;
}

.btn-primary {
  background: white;
  color: #667eea;
}

.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
}

.btn-secondary {
  background: rgba(255, 255, 255, 0.1);
  color: white;
  border: 2px solid rgba(255, 255, 255, 0.3);
}

.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.5);
}

.features-section {
  padding: 4rem 2rem;
  background: #f8f9fa;
}

.feature-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.feature-card {
  background: white;
  padding: 2rem;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.feature-card h3 {
  margin-top: 0;
  margin-bottom: 1rem;
  color: #1f2937;
  font-size: 1.5rem;
}

.feature-card p {
  color: #6b7280;
  line-height: 1.6;
  margin-bottom: 1.5rem;
}

.layers, .auth-features, .tech-stack, .status-indicators {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.layer, .auth-feature, .tech-item {
  background: #f3f4f6;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-size: 0.9rem;
  color: #374151;
}

.layer {
  background: #e0e7ff;
  color: #3730a3;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 6px;
}

.status-item.success {
  background: #d1fae5;
  color: #065f46;
}

.status-icon {
  font-size: 1rem;
}

.footer {
  background: #1f2937;
  color: white;
  text-align: center;
  padding: 2rem;
}

.footer p {
  margin: 0;
  opacity: 0.8;
}

@media (max-width: 768px) {
  .navbar {
    padding: 1rem;
  }
  
  .nav-links {
    gap: 0.5rem;
  }
  
  .nav-link {
    padding: 0.5rem 0.75rem;
    font-size: 0.9rem;
  }
  
  .hero-title {
    font-size: 2.5rem;
  }
  
  .hero-section {
    padding: 2rem 1rem;
  }
  
  .features-section {
    padding: 2rem 1rem;
  }
  
  .feature-grid {
    grid-template-columns: 1fr;
  }
  
  .hero-actions {
    flex-direction: column;
    align-items: center;
  }
  
  .btn {
    padding: 0.75rem 1.5rem;
  }
}
</style>
