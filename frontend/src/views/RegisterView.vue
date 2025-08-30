<template>
  <div class="register-container">
    <div class="register-card">
      <h1 class="register-title">Create Account</h1>
      <p class="register-subtitle">Join us today! Please fill in your details to get started.</p>
      
      <form @submit.prevent="handleSubmit" class="register-form">
        <div class="form-row">
          <div class="form-group">
            <label for="firstName">First Name</label>
            <input
              id="firstName"
              v-model="firstName"
              type="text"
              required
              :class="{ 'error': firstNameError }"
              placeholder="Enter your first name"
              autocomplete="given-name"
            />
            <span v-if="firstNameError" class="error-message">{{ firstNameError }}</span>
          </div>

          <div class="form-group">
            <label for="lastName">Last Name</label>
            <input
              id="lastName"
              v-model="lastName"
              type="text"
              required
              :class="{ 'error': lastNameError }"
              placeholder="Enter your last name"
              autocomplete="family-name"
            />
            <span v-if="lastNameError" class="error-message">{{ lastNameError }}</span>
          </div>
        </div>

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
            autocomplete="new-password"
          />
          <span v-if="passwordError" class="error-message">{{ passwordError }}</span>
        </div>

        <div v-if="error" class="form-error">
          {{ error }}
        </div>

        <button
          type="submit"
          :disabled="isLoading"
          class="register-button"
        >
          {{ isLoading ? 'Creating Account...' : 'Create Account' }}
        </button>
      </form>

      <div class="register-footer">
        <p>
          Already have an account?
          <router-link to="/login" class="login-link">Sign in here</router-link>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuth } from '../composables/useAuth';
import * as yup from 'yup';

const router = useRouter();
const { register, isLoading, error, clearError } = useAuth();

// Form data
const firstName = ref('');
const lastName = ref('');
const email = ref('');
const password = ref('');

// Validation schema matching backend rules
const validationSchema = yup.object({
  firstName: yup
    .string()
    .required('First name is required')
    .min(1, 'First name cannot be empty')
    .max(100, 'First name is too long'),
  lastName: yup
    .string()
    .required('Last name is required')
    .min(1, 'Last name cannot be empty')
    .max(100, 'Last name is too long'),
  email: yup
    .string()
    .required('Email is required')
    .email('Invalid email format')
    .max(320, 'Email is too long'),
  password: yup
    .string()
    .required('Password is required')
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password is too long')
    .matches(/(?=.*[a-z])/, 'Password must contain at least one lowercase letter')
    .matches(/(?=.*[A-Z])/, 'Password must contain at least one uppercase letter')
    .matches(/(?=.*\d)/, 'Password must contain at least one number')
});

// Form validation errors
const firstNameError = ref('');
const lastNameError = ref('');
const emailError = ref('');
const passwordError = ref('');

const validateField = async (field: 'firstName' | 'lastName' | 'email' | 'password') => {
  try {
    if (field === 'firstName') {
      await validationSchema.fields.firstName.validate(firstName.value);
      firstNameError.value = '';
    } else if (field === 'lastName') {
      await validationSchema.fields.lastName.validate(lastName.value);
      lastNameError.value = '';
    } else if (field === 'email') {
      await validationSchema.fields.email.validate(email.value);
      emailError.value = '';
    } else if (field === 'password') {
      await validationSchema.fields.password.validate(password.value);
      passwordError.value = '';
    }
  } catch (err: any) {
    if (field === 'firstName') {
      firstNameError.value = err.message;
    } else if (field === 'lastName') {
      lastNameError.value = err.message;
    } else if (field === 'email') {
      emailError.value = err.message;
    } else if (field === 'password') {
      passwordError.value = err.message;
    }
  }
};

const validateForm = async (): Promise<boolean> => {
  await validateField('firstName');
  await validateField('lastName');
  await validateField('email');
  await validateField('password');
  
  return !firstNameError.value && !lastNameError.value && !emailError.value && !passwordError.value;
};

const handleSubmit = async () => {
  clearError();
  
  if (!(await validateForm())) {
    return;
  }

  try {
    await register({
      firstName: firstName.value,
      lastName: lastName.value,
      email: email.value,
      password: password.value
    });
    
    // Successful registration - router guard will handle redirect
    router.push('/dashboard');
  } catch (err) {
    // Error is handled by useAuth composable
    console.error('Registration failed:', err);
  }
};

// Clear field errors on input
const clearFieldError = (field: 'firstName' | 'lastName' | 'email' | 'password') => {
  if (field === 'firstName') {
    firstNameError.value = '';
  } else if (field === 'lastName') {
    lastNameError.value = '';
  } else if (field === 'email') {
    emailError.value = '';
  } else if (field === 'password') {
    passwordError.value = '';
  }
  clearError();
};
</script>

<style scoped>
.register-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 1rem;
}

.register-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  padding: 2rem;
  width: 100%;
  max-width: 500px;
}

.register-title {
  font-size: 2rem;
  font-weight: bold;
  text-align: center;
  color: #1a202c;
  margin-bottom: 0.5rem;
}

.register-subtitle {
  color: #718096;
  text-align: center;
  margin-bottom: 2rem;
}

.register-form {
  space-y: 1rem;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-row .form-group {
  margin-bottom: 0;
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

.register-button {
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

.register-button:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
}

.register-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.register-footer {
  text-align: center;
  margin-top: 1.5rem;
}

.register-footer p {
  color: #718096;
  margin: 0;
}

.login-link {
  color: #667eea;
  text-decoration: none;
  font-weight: 500;
}

.login-link:hover {
  text-decoration: underline;
}

@media (max-width: 640px) {
  .form-row {
    grid-template-columns: 1fr;
    gap: 0;
  }
  
  .form-row .form-group {
    margin-bottom: 1.5rem;
  }
}
</style>
