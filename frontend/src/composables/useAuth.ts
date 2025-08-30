import { ref, computed, onMounted } from 'vue';
import { authService, type User, type LoginCredentials, type RegisterData } from '../services/authService';

const user = ref<User | null>(null);
const isLoading = ref(false);
const error = ref<string | null>(null);

export function useAuth() {
  const isAuthenticated = computed(() => !!user.value && authService.isAuthenticated());

  const login = async (credentials: LoginCredentials): Promise<void> => {
    isLoading.value = true;
    error.value = null;
    
    try {
      const response = await authService.login(credentials);
      user.value = response.user;
    } catch (err: any) {
      error.value = err.message;
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  const register = async (data: RegisterData): Promise<void> => {
    isLoading.value = true;
    error.value = null;
    
    try {
      const response = await authService.register(data);
      user.value = response.user;
    } catch (err: any) {
      error.value = err.message;
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  const logout = async (): Promise<void> => {
    isLoading.value = true;
    error.value = null;
    
    try {
      await authService.logout();
      user.value = null;
    } catch (err: any) {
      error.value = err.message;
      // Still clear user even if logout API fails
      user.value = null;
    } finally {
      isLoading.value = false;
    }
  };

  const fetchProfile = async (): Promise<void> => {
    if (!authService.isAuthenticated()) {
      return;
    }

    isLoading.value = true;
    error.value = null;
    
    try {
      const response = await authService.getProfile();
      user.value = response.user;
    } catch (err: any) {
      error.value = err.message;
      // If profile fetch fails, user might be logged out
      if (err.message.includes('401') || err.message.includes('Unauthorized')) {
        user.value = null;
      }
    } finally {
      isLoading.value = false;
    }
  };

  const initializeAuth = async (): Promise<void> => {
    if (authService.isAuthenticated()) {
      await fetchProfile();
    }
  };

  const clearError = (): void => {
    error.value = null;
  };

  // Initialize authentication state when composable is first used
  onMounted(() => {
    initializeAuth();
  });

  return {
    // State
    user: computed(() => user.value),
    isAuthenticated,
    isLoading: computed(() => isLoading.value),
    error: computed(() => error.value),
    
    // Actions
    login,
    register,
    logout,
    fetchProfile,
    initializeAuth,
    clearError
  };
}
