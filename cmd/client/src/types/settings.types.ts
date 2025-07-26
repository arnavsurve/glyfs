export interface UserSettings {
  anthropic_api_key: string; // Masked
  openai_api_key: string;    // Masked
  gemini_api_key: string;    // Masked
}

export interface UpdateUserSettingsRequest {
  anthropic_api_key?: string;
  openai_api_key?: string;
  gemini_api_key?: string;
}