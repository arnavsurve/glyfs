import React, { createContext, useContext, useReducer, useEffect, useRef } from "react";
import type { ReactNode } from "react";
import type {
  AuthState,
  AuthContextType,
  LoginCredentials,
  SignupCredentials,
  User,
  AuthResponse,
} from "../types/auth.types";
import { authApi } from "../api/auth.api";
import { apiClient } from "../api/client";

// Auth Actions
type AuthAction =
  | { type: "AUTH_START" }
  | { type: "AUTH_SUCCESS"; payload: { user: User } }
  | { type: "AUTH_FAILURE"; payload: string }
  | { type: "LOGOUT" }
  | { type: "CLEAR_ERROR" }
  | { type: "SET_LOADING"; payload: boolean };

// Initial State
const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: true, // Start with loading true to prevent premature redirects
  error: null,
};

// Auth Reducer
const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case "AUTH_START":
      return {
        ...state,
        isLoading: true,
        error: null,
      };
    case "AUTH_SUCCESS":
      return {
        ...state,
        user: action.payload.user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };
    case "AUTH_FAILURE":
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: action.payload,
      };
    case "LOGOUT":
      return {
        user: null,
        isAuthenticated: false,
        isLoading: false, // Don't show loading spinner after logout
        error: null,
      };
    case "CLEAR_ERROR":
      return {
        ...state,
        error: null,
      };
    case "SET_LOADING":
      return {
        ...state,
        isLoading: action.payload,
      };
    default:
      return state;
  }
};

// Create Context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Add logout API function
const logoutApi = async (): Promise<void> => {
  try {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });
  } catch (error) {
    console.error("Logout API call failed:", error);
    // Continue with local logout even if API call fails
  }
};

// AuthProvider Component
interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);
  const refreshInProgress = useRef(false);

  // Check auth status from server on mount since we can't access httpOnly cookies
  useEffect(() => {
    const checkAuthStatus = async () => {
      dispatch({ type: "SET_LOADING", payload: true });

      try {
        const response = await apiClient.get<AuthResponse>("/auth/me");

        if (response.status === 200) {
          const data = response.data;
          const user: User = {
            id: data.user_id,
            email: data.user_email,
            auth_provider: data.auth_provider,
            display_name: data.display_name,
            avatar_url: data.avatar_url,
            tier: (data.tier as 'free' | 'pro') || 'free',
            tier_limits: data.tier_limits || { 
              agent_limit: 3, agents_used: 0,
              mcp_server_limit: 9, mcp_servers_used: 0,
              api_key_limit: 3, api_keys_used: 0 
            },
          };
          dispatch({
            type: "AUTH_SUCCESS",
            payload: { user },
          });
        } else {
          dispatch({ type: "SET_LOADING", payload: false });
        }
      } catch (error) {
        // If initial auth check fails, just set loading to false
        // Don't attempt refresh here to avoid conflicts with other refresh logic
        console.log("Initial auth check failed, user likely not logged in");
        dispatch({ type: "SET_LOADING", payload: false });
      }
    };

    checkAuthStatus();
  }, []);

  // Automatic token refresh - runs every 12 minutes when authenticated
  // (access token expires in 15 minutes, so this gives a 3-minute buffer)
  useEffect(() => {
    if (!state.isAuthenticated) return;

    const refreshInterval = setInterval(
      async () => {
        // Skip if a refresh is already in progress
        if (refreshInProgress.current) {
          console.log("Skipping background refresh - already in progress");
          return;
        }

        try {
          refreshInProgress.current = true;
          await authApi.refreshToken();
          console.log("Background token refresh successful");
        } catch (error) {
          console.error("Background token refresh failed:", error);
          // Force logout on refresh failure to prevent broken auth state
          dispatch({ type: "LOGOUT" });
          clearInterval(refreshInterval);
        } finally {
          refreshInProgress.current = false;
        }
      },
      12 * 60 * 1000,
    ); // Refresh every 12 minutes

    return () => clearInterval(refreshInterval);
  }, [state.isAuthenticated]);

  // Regular auth login commented out - OAuth only
  const login = async (credentials: LoginCredentials): Promise<void> => {
    // OAuth only - regular login disabled
    const errorMessage = "Please use OAuth providers (GitHub or Google) to sign in";
    dispatch({ type: "AUTH_FAILURE", payload: errorMessage });
    throw new Error(errorMessage);
    
    // Original implementation:
    // try {
    //   dispatch({ type: "AUTH_START" });

    //   const data = await authApi.login(credentials);

    //   const user: User = {
    //     id: data.user_id,
    //     email: data.user_email,
    //     auth_provider: data.auth_provider,
    //     display_name: data.display_name,
    //     avatar_url: data.avatar_url,
    //     tier: (data.tier as 'free' | 'pro') || 'free',
    //     tier_limits: data.tier_limits || { agent_limit: 3, agents_used: 0 },
    //   };

    //   dispatch({
    //     type: "AUTH_SUCCESS",
    //     payload: { user },
    //   });
    // } catch (error) {
    //   const errorMessage =
    //     error instanceof Error ? error.message : "Login failed";
    //   dispatch({ type: "AUTH_FAILURE", payload: errorMessage });
    //   throw error;
    // }
  };

  // Regular auth signup commented out - OAuth only
  const signup = async (credentials: SignupCredentials): Promise<void> => {
    // OAuth only - regular signup disabled
    const errorMessage = "Please use OAuth providers (GitHub or Google) to create an account";
    dispatch({ type: "AUTH_FAILURE", payload: errorMessage });
    throw new Error(errorMessage);
    
    // Original implementation:
    // try {
    //   dispatch({ type: "AUTH_START" });

    //   const data = await authApi.signup(credentials);

    //   const user: User = {
    //     id: data.user_id,
    //     email: data.user_email,
    //     auth_provider: data.auth_provider,
    //     display_name: data.display_name,
    //     avatar_url: data.avatar_url,
    //     tier: (data.tier as 'free' | 'pro') || 'free',
    //     tier_limits: data.tier_limits || { agent_limit: 3, agents_used: 0 },
    //   };

    //   dispatch({
    //     type: "AUTH_SUCCESS",
    //     payload: { user },
    //   });
    // } catch (error) {
    //   const errorMessage =
    //     error instanceof Error ? error.message : "Signup failed";
    //   dispatch({ type: "AUTH_FAILURE", payload: errorMessage });
    //   throw error;
    // }
  };

  const logout = async (): Promise<void> => {
    try {
      await logoutApi();
    } finally {
      // Always dispatch logout even if API call fails
      dispatch({ type: "LOGOUT" });
    }
  };

  const clearError = (): void => {
    dispatch({ type: "CLEAR_ERROR" });
  };

  const refreshToken = async (): Promise<void> => {
    // Skip if a refresh is already in progress
    if (refreshInProgress.current) {
      console.log("Refresh already in progress, skipping");
      return;
    }

    try {
      refreshInProgress.current = true;
      await authApi.refreshToken();
      console.log("Manual token refresh successful");
    } catch (error) {
      console.error("Manual token refresh failed:", error);
      dispatch({ type: "LOGOUT" });
      throw error;
    } finally {
      refreshInProgress.current = false;
    }
  };

  const contextValue: AuthContextType = {
    ...state,
    login,
    signup,
    logout,
    clearError,
    refreshToken,
  };

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

