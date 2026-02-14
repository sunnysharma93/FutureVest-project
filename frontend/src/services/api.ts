import axios, { AxiosError, AxiosResponse } from 'axios';
import { store } from '../store';
import { logout } from '../store/slices/authSlice';

const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:8080/api/v1';

export const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Request interceptor to add JWT token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor to handle 401 and token refresh
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as any;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        // Attempt to refresh token
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          const response = await axios.post(`${API_BASE}/auth/refresh`, {
            refreshToken,
          });
          
          const { token } = response.data;
          localStorage.setItem('token', token);
          
          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, logout user
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        store.dispatch(logout());
        window.dispatchEvent(new Event('auth:logout'));
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

// Generic API wrapper with loading and error states
export class ApiService {
  static async get<T>(url: string, params?: any): Promise<T> {
    const response = await api.get<T>(url, { params });
    return response.data;
  }

  static async post<T>(url: string, data?: any, config?: any): Promise<T> {
    const response = await api.post<T>(url, data, config);
    return response.data;
  }

  static async put<T>(url: string, data?: any): Promise<T> {
    const response = await api.put<T>(url, data);
    return response.data;
  }

  static async patch<T>(url: string, data?: any): Promise<T> {
    const response = await api.patch<T>(url, data);
    return response.data;
  }

  static async delete<T>(url: string): Promise<T> {
    const response = await api.delete<T>(url);
    return response.data;
  }

  // File upload with progress
  static async upload<T>(url: string, formData: FormData, onProgress?: (progress: number) => void): Promise<T> {
    const response = await api.post<T>(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    });
    return response.data;
  }
}

// Error handling utility
export const handleApiError = (error: any): string => {
  if (error.response?.data?.message) {
    return error.response.data.message;
  }
  if (error.response?.data?.error) {
    return error.response.data.error;
  }
  if (error.message) {
    return error.message;
  }
  return 'An unexpected error occurred';
};

export default api;
