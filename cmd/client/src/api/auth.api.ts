import { apiClient } from './client';
import type { AuthResponse } from '../types/auth.types';

export const authApi = {
  // Regular auth methods commented out - OAuth only
  // login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
  //   const response = await apiClient.post<AuthResponse>('/auth/login', credentials);
  //   return response.data;
  // },

  // signup: async (credentials: SignupCredentials): Promise<AuthResponse> => {
  //   const response = await apiClient.post<AuthResponse>('/auth/signup', credentials);
  //   return response.data;
  // },

  refreshToken: async (): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/refresh');
    return response.data;
  },

  // forgotPassword: async (email: string): Promise<{ message: string }> => {
  //   const response = await apiClient.post<{ message: string }>('/auth/forgot-password', { email });
  //   return response.data;
  // },

  // resetPassword: async (token: string, password: string): Promise<{ message: string }> => {
  //   const response = await apiClient.post<{ message: string }>('/auth/reset-password', { token, password });
  //   return response.data;
  // },
};