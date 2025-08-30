import { createRouter, createWebHistory, type RouteLocationNormalized } from 'vue-router';
import { authService } from '../services/authService';

// Route components
import HomeView from '../views/HomeView.vue';
import LoginView from '../views/LoginView.vue';
import RegisterView from '../views/RegisterView.vue';
import DashboardView from '../views/DashboardView.vue';

const routes = [
  {
    path: '/',
    name: 'Home',
    component: HomeView,
    meta: { requiresAuth: false }
  },
  {
    path: '/login',
    name: 'Login',
    component: LoginView,
    meta: { requiresAuth: false, redirectIfAuthenticated: true }
  },
  {
    path: '/register',
    name: 'Register',
    component: RegisterView,
    meta: { requiresAuth: false, redirectIfAuthenticated: true }
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: DashboardView,
    meta: { requiresAuth: true }
  },
  // Redirect to dashboard for authenticated users, login for unauthenticated
  {
    path: '/:pathMatch(.*)*',
    redirect: () => {
      return authService.isAuthenticated() ? '/dashboard' : '/login';
    }
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

// Global navigation guards
router.beforeEach((to, from, next) => {
  const isAuthenticated = authService.isAuthenticated();
  const requiresAuth = to.matched.some(record => record.meta.requiresAuth);
  const redirectIfAuthenticated = to.matched.some(record => record.meta.redirectIfAuthenticated);

  if (requiresAuth && !isAuthenticated) {
    // Store intended destination for post-login redirect
    sessionStorage.setItem('intendedRoute', to.fullPath);
    next('/login');
  } else if (redirectIfAuthenticated && isAuthenticated) {
    // Redirect authenticated users away from login/register pages
    next('/dashboard');
  } else {
    next();
  }
});

// Handle post-login redirects
router.afterEach((to, from) => {
  if (to.name === 'Dashboard' && from.name === 'Login') {
    // Check if there was an intended route
    const intendedRoute = sessionStorage.getItem('intendedRoute');
    if (intendedRoute && intendedRoute !== '/login' && intendedRoute !== to.fullPath) {
      sessionStorage.removeItem('intendedRoute');
      router.push(intendedRoute);
    }
  }
});

export default router;
