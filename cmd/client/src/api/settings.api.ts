import { apiClient } from './client';
import type { UserSettings, UpdateUserSettingsRequest } from '../types/settings.types';

export const settingsApi = {
  getSettings: async (): Promise<UserSettings> => {
    const response = await apiClient.get<UserSettings>('/user/settings');
    return response.data;
  },

  updateSettings: async (data: UpdateUserSettingsRequest): Promise<UserSettings> => {
    const response = await apiClient.put<UserSettings>('/user/settings', data);
    return response.data;
  },
};