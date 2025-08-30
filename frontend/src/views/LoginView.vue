<template>
  <div class="login-container">
    <div class="login-card">
      <h1 class="login-title">Sign In</h1>
      <p class="login-subtitle">Welcome back! Please sign in to your account.</p>
      
      <form @submit.prevent="handleSubmit" class="login-form">
        <div class="form-group">
          <label for="email">Email</label>
          <input
            id="email"
            v-model="email"
            type="email"
            required
            :class="{ 'error': emailError }"
            placeholder="Enter your email"
            autocomplete="email"
          />
          <span v-if="emailError" class="error-message">{{ emailError }}</span>
        </div>

        <div class="form-group">
          <label for="password">Password</label>
          <input
            id="password"
            v-model="password"
            type="password"
            required
            :class="{ 'error': passwordError }"
            placeholder="Enter your password"
            autocomplete="current-password"
          />
          <span v-if="passwordError" class="error-message">{{ passwordError }}</span>
        </div>

        <div v-if="error" class="form-error">
          {{ error }}
        </div>

        <button
          type="submit"
          :disabled="isLoading"
          class="login-button"
        >
          {{ isLoading ? 'Signing in...' : 'Sign In' }}
        </button>
      </form>

      <div class="login-footer">
        <p>
          Don't have an account?
          <router-link to="/register" class="register-link">Sign up here</router-link>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuth } from '../composables/useAuth';
import * as yup from 'yup';

const router = useRouter();
const { login, isLoading, error, clearError } = useAuth();

// Form data
const email = ref('');
const password = ref('');

// Validation schema matching backend rules
const validationSchema = yup.object({
  email: yup
    .string()
    .required('Email is required')
    .email('Invalid email format')
    .max(320, 'Email is too long'),
  password: yup
    .string()
    .required('Password is required')
    .max(128, 'Password is too long')
});

// Form validation errors
const emailError = ref('');
const passwordError = ref('');

const validateField = async (field: 'email' | 'password') => {
  try {
    if (field === 'email') {
      await validationSchema.fields.email.validate(email.value);
      emailError.value = '';
    } else if (field === 'password') {
      await validationSchema.fields.password.validate(password.value);
      passwordError.value = '';
    }
  } catch (err: any) {
    if (field === 'email') {
      emailError.value = err.message;
    } else if (field === 'password') {
      passwordError.value = err.message;
    }
  }
};

const validateForm = async (): Promise<boolean> => {
  await validateField('email');
  await validateField('password');
  
  return !emailError.value && !passwordError.value;
};

const handleSubmit = async () => {
  clearError();
  
  if (!(await validateForm())) {
    return;
  }

  try {
    await login({
      email: email.value,
      password: password.value
    });
    
    // Successful login - router guard will handle redirect
    router.push('/dashboard');
  } catch (err) {
    // Error is handled by useAuth composable
    console.error('Login failed:', err);
  }
};

// Clear field errors on input
const clearFieldError = (field: 'email' | 'password') => {
  if (field === 'email') {
    emailError.value = '';
  } else if (field === 'password') {
    passwordError.value = '';
  }
  clearError();
};
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 1rem;
}

.login-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  padding: 2rem;
  width: 100%;
  max-width: 400px;
}

.login-title {
  font-size: 2rem;
  font-weight: bold;
  text-align: center;
  color: #1a202c;
  margin-bottom: 0.5rem;
}

.login-subtitle {
  color: #718096;
  text-align: center;
  margin-bottom: 2rem;
}

.login-form {
  space-y: 1rem;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  font-weight: 500;
  color: #374151;
  margin-bottom: 0.5rem;
}

.form-group input {
  width: 100%;
  padding: 0.75rem;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 1rem;
  transition: border-color 0.2s, box-shadow 0.2s;
  box-sizing: border-box;
}

.form-group input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.form-group input.error {
  border-color: #ef4444;
}

.error-message {
  color: #ef4444;
  font-size: 0.875rem;
  margin-top: 0.25rem;
  display: block;
}

.form-error {
  background: #fee2e2;
  border: 1px solid #fecaca;
  color: #dc2626;
  padding: 0.75rem;
  border-radius: 8px;
  margin-bottom: 1rem;
  text-align: center;
}

.login-button {
  width: 100%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  padding: 0.75rem;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.login-button:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
}

.login-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.login-footer {
  text-align: center;
  margin-top: 1.5rem;
}

.login-footer p {
  color: #718096;
  margin: 0;
}

.register-link {
  color: #667eea;
  text-decoration: none;
  font-weight: 500;
}

.register-link:hover {
  text-decoration: underline;
}
</style>
