<template>
  <div class="dashboard-container">
    <div class="dashboard-header">
      <h1 class="welcome-title">Welcome to Your Dashboard</h1>
      <p class="welcome-subtitle">You have successfully logged in!</p>
    </div>

    <div class="dashboard-content">
      <div class="profile-card" v-if="user">
        <div class="profile-header">
          <div class="avatar">
            {{ (user.firstName?.charAt(0) || '') }}{{ (user.lastName?.charAt(0) || '') }}
          </div>
          <div class="profile-info">
            <h2 class="user-name">{{ user.firstName }} {{ user.lastName }}</h2>
            <p class="user-email">{{ user.email }}</p>
            <span class="user-status" :class="{ 'active': user.isActive, 'inactive': !user.isActive }">
              {{ user.isActive ? 'Active' : 'Inactive' }}
            </span>
          </div>
        </div>

        <div class="profile-details" v-if="user.createdAt">
          <div class="detail-item">
            <strong>Member since:</strong>
            <span>{{ formatDate(user.createdAt) }}</span>
          </div>
          <div class="detail-item" v-if="user.updatedAt">
            <strong>Last updated:</strong>
            <span>{{ formatDate(user.updatedAt) }}</span>
          </div>
        </div>
      </div>

      <div class="loading-card" v-else-if="isLoading">
        <div class="loading-spinner"></div>
        <p>Loading your profile...</p>
      </div>

      <div class="error-card" v-else-if="error">
        <div class="error-icon">⚠️</div>
        <h3>Unable to load profile</h3>
        <p>{{ error }}</p>
        <button @click="fetchProfile" class="retry-button">
          Retry
        </button>
      </div>

      <div class="actions-card">
        <h3>Quick Actions</h3>
        <div class="action-buttons">
          <button @click="refreshProfile" class="action-button secondary" :disabled="isLoading">
            <span class="button-icon">🔄</span>
            Refresh Profile
          </button>
          <button @click="handleLogout" class="action-button danger" :disabled="isLoading">
            <span class="button-icon">🚪</span>
            Sign Out
          </button>
        </div>
      </div>

      <div class="info-card">
        <h3>🛡️ Protected Page</h3>
        <p>
          This is a protected page that can only be accessed by authenticated users. 
          Your authentication token is automatically included in all API requests.
        </p>
        <div class="features-list">
          <div class="feature-item">
            <span class="feature-icon">✅</span>
            <span>Automatic token management</span>
          </div>
          <div class="feature-item">
            <span class="feature-icon">✅</span>
            <span>Session persistence</span>
          </div>
          <div class="feature-item">
            <span class="feature-icon">✅</span>
            <span>Secure logout</span>
          </div>
          <div class="feature-item">
            <span class="feature-icon">✅</span>
            <span>Route protection</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuth } from '../composables/useAuth';

const router = useRouter();
const { user, isLoading, error, logout, fetchProfile } = useAuth();

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

const refreshProfile = async () => {
  await fetchProfile();
};

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Ensure profile is loaded when component mounts
onMounted(() => {
  if (!user.value && !isLoading.value) {
    fetchProfile();
  }
});
</script>

<style scoped>
.dashboard-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 2rem 1rem;
}

.dashboard-header {
  text-align: center;
  color: white;
  margin-bottom: 2rem;
}

.welcome-title {
  font-size: 2.5rem;
  font-weight: bold;
  margin-bottom: 0.5rem;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.welcome-subtitle {
  font-size: 1.2rem;
  opacity: 0.9;
}

.dashboard-content {
  max-width: 800px;
  margin: 0 auto;
  display: grid;
  gap: 1.5rem;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
}

.profile-card, .loading-card, .error-card, .actions-card, .info-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  padding: 2rem;
}

.profile-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.avatar {
  width: 60px;
  height: 60px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  font-weight: bold;
}

.profile-info {
  flex: 1;
}

.user-name {
  margin: 0 0 0.25rem 0;
  font-size: 1.5rem;
  color: #1a202c;
}

.user-email {
  margin: 0 0 0.5rem 0;
  color: #718096;
  font-size: 1rem;
}

.user-status {
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.875rem;
  font-weight: 500;
}

.user-status.active {
  background: #d4edda;
  color: #155724;
}

.user-status.inactive {
  background: #f8d7da;
  color: #721c24;
}

.profile-details {
  border-top: 1px solid #e5e7eb;
  padding-top: 1rem;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}

.detail-item strong {
  color: #374151;
}

.detail-item span {
  color: #718096;
}

.loading-card, .error-card {
  text-align: center;
  grid-column: 1 / -1;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #e5e7eb;
  border-top: 4px solid #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.retry-button {
  background: #667eea;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 0.75rem 1.5rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.retry-button:hover {
  background: #5a67d8;
}

.actions-card h3, .info-card h3 {
  margin-top: 0;
  color: #1a202c;
  margin-bottom: 1rem;
}

.action-buttons {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.action-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border: none;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  flex: 1;
  min-width: 140px;
  justify-content: center;
}

.action-button.secondary {
  background: #e5e7eb;
  color: #374151;
}

.action-button.secondary:hover:not(:disabled) {
  background: #d1d5db;
}

.action-button.danger {
  background: #ef4444;
  color: white;
}

.action-button.danger:hover:not(:disabled) {
  background: #dc2626;
}

.action-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.button-icon {
  font-size: 1rem;
}

.features-list {
  margin-top: 1rem;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.feature-icon {
  font-size: 1rem;
}

.info-card p {
  color: #718096;
  line-height: 1.6;
  margin-bottom: 1rem;
}

@media (max-width: 640px) {
  .dashboard-content {
    grid-template-columns: 1fr;
  }
  
  .action-buttons {
    flex-direction: column;
  }
  
  .action-button {
    min-width: auto;
  }
  
  .profile-header {
    flex-direction: column;
    text-align: center;
  }
  
  .detail-item {
    flex-direction: column;
    gap: 0.25rem;
    align-items: flex-start;
  }
}
</style>
