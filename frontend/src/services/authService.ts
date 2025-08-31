import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000/api/auth';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  isAdmin: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthResponse {
  message: string;
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface ApiErrorResponse {
  error: string;
  code: string;
  errors?: Array<{
    field: string;
    message: string;
  }>;
  details?: string;
}

class AuthService {
  private readonly TOKEN_KEY = 'accessToken';
  private readonly REFRESH_TOKEN_KEY = 'refreshToken';

  constructor() {
    // Set up axios interceptors
    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor to add token to headers
    axios.interceptors.request.use(
      (config) => {
        const token = this.getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor to handle token refresh
    axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            await this.refreshToken();
            const token = this.getToken();
            if (token) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              return axios(originalRequest);
            }
          } catch (refreshError) {
            this.logout();
            window.location.href = '/login';
          }
        }

        return Promise.reject(error);
      }
    );
  }

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const response = await axios.post<AuthResponse>(`${API_BASE_URL}/login`, credentials);
      const { accessToken, refreshToken } = response.data;
      
      this.setToken(accessToken);
      this.setRefreshToken(refreshToken);
      
      return response.data;
    } catch (error: any) {
      throw this.handleApiError(error);
    }
  }

  async register(data: RegisterData): Promise<AuthResponse> {
    try {
      const response = await axios.post<AuthResponse>(`${API_BASE_URL}/register`, data);
      const { accessToken, refreshToken } = response.data;
      
      this.setToken(accessToken);
      this.setRefreshToken(refreshToken);
      
      return response.data;
    } catch (error: any) {
      throw this.handleApiError(error);
    }
  }

  async getProfile(): Promise<{ user: User }> {
    try {
      const response = await axios.get<{ user: User }>(`${API_BASE_URL}/profile`);
      return response.data;
    } catch (error: any) {
      throw this.handleApiError(error);
    }
  }

  async refreshToken(): Promise<void> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await axios.post<{ accessToken: string; refreshToken: string }>(
        `${API_BASE_URL}/refresh`,
        { refreshToken }
      );
      
      this.setToken(response.data.accessToken);
      this.setRefreshToken(response.data.refreshToken);
    } catch (error: any) {
      this.logout();
      throw this.handleApiError(error);
    }
  }

  async deleteUser(userId: string): Promise<{ message: string }> {
    try {
      const response = await axios.delete<{ message: string }>(`${API_BASE_URL}/users/${userId}`);
      return response.data;
    } catch (error: any) {
      throw this.handleApiError(error);
    }
  }

  async logout(): Promise<void> {
    try {
      await axios.post(`${API_BASE_URL}/logout`);
    } catch (error) {
      // Continue with logout even if API call fails
      console.warn('Logout API call failed:', error);
    } finally {
      this.clearTokens();
    }
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  private setToken(token: string): void {
    localStorage.setItem(this.TOKEN_KEY, token);
  }

  private setRefreshToken(token: string): void {
    localStorage.setItem(this.REFRESH_TOKEN_KEY, token);
  }

  private clearTokens(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
  }

  private handleApiError(error: any): Error {
    if (error.response?.data) {
      const apiError = error.response.data as ApiErrorResponse;
      if (apiError.errors && apiError.errors.length > 0) {
        // Return first validation error for simplicity
        return new Error(apiError.errors[0].message);
      }
      return new Error(apiError.error || 'An error occurred');
    }
    return new Error(error.message || 'Network error occurred');
  }
}

export const authService = new AuthService();
