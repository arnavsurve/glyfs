export interface User {
  id: number;
  email: string;
  auth_provider?: string;
  display_name?: string;
  avatar_url?: string;
  tier: 'free' | 'pro';
  tier_limits: {
    agent_limit: number;
    agents_used: number;
    mcp_server_limit: number;
    mcp_servers_used: number;
    api_key_limit: number;
    api_keys_used: number;
  };
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  message: string;
  user_id: number;
  user_email: string;
  auth_provider?: string;
  display_name?: string;
  avatar_url?: string;
  tier?: string;
  tier_limits?: {
    agent_limit: number;
    agents_used: number;
    mcp_server_limit: number;
    mcp_servers_used: number;
    api_key_limit: number;
    api_keys_used: number;
  };
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>;
  signup: (credentials: SignupCredentials) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  refreshToken: () => Promise<void>;
}

export interface ApiError {
  message: string;
  status?: number;
}

export interface AuthProvider {
  id: string;
  name: string;
  display_name: string;
  icon_url?: string;
  connected: boolean;
}

export interface AuthProvidersResponse {
  providers: AuthProvider[];
}

export type OAuthProvider = 'github' | 'google';