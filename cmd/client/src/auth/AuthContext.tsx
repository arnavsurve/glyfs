import React, { createContext, useContext, useReducer, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { AuthState, AuthContextType, LoginCredentials, SignupCredentials, User, AuthResponse } from '../types/auth.types';
import { authApi } from '../api/auth.api';
import { apiClient } from '../api/client';

// Auth Actions
type AuthAction =
  | { type: 'AUTH_START' }
  | { type: 'AUTH_SUCCESS'; payload: { user: User } }
  | { type: 'AUTH_FAILURE'; payload: string }
  | { type: 'LOGOUT' }
  | { type: 'CLEAR_ERROR' }
  | { type: 'SET_LOADING'; payload: boolean };

// Initial State
const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
};

// Auth Reducer
const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'AUTH_START':
      return {
        ...state,
        isLoading: true,
        error: null,
      };
    case 'AUTH_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };
    case 'AUTH_FAILURE':
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: action.payload,
      };
    case 'LOGOUT':
      return {
        ...initialState,
      };
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
      };
    case 'SET_LOADING':
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
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    });
  } catch (error) {
    console.error('Logout API call failed:', error);
    // Continue with local logout even if API call fails
  }
};


// AuthProvider Component
interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Check auth status from server on mount since we can't access httpOnly cookies
  useEffect(() => {
    const checkAuthStatus = async () => {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      try {
        const response = await apiClient.get<AuthResponse>('/auth/me');
        
        if (response.status === 200) {
          const data = response.data;
          const user: User = {
            id: data.user_id,
            email: data.user_email,
          };
          dispatch({
            type: 'AUTH_SUCCESS',
            payload: { user },
          });
        } else {
          dispatch({ type: 'SET_LOADING', payload: false });
        }
      } catch (error) {
        // If auth check fails, try to refresh token
        try {
          await authApi.refreshToken();
          const retryResponse = await apiClient.get<AuthResponse>('/auth/me');
          
          if (retryResponse.status === 200) {
            const data = retryResponse.data;
            const user: User = {
              id: data.user_id,
              email: data.user_email,
            };
            dispatch({
              type: 'AUTH_SUCCESS',
              payload: { user },
            });
          } else {
            dispatch({ type: 'SET_LOADING', payload: false });
          }
        } catch (refreshError) {
          console.error("Auth check and refresh failed:", refreshError);
          dispatch({ type: 'SET_LOADING', payload: false });
        }
      }
    };

    checkAuthStatus();
  }, []);

  // Automatic token refresh - runs every 10 minutes when authenticated
  useEffect(() => {
    if (!state.isAuthenticated) return;

    const refreshInterval = setInterval(async () => {
      try {
        await authApi.refreshToken();
        console.log('Token refreshed successfully');
      } catch (error) {
        console.error('Background token refresh failed:', error);
        // If refresh fails, the user will be logged out on their next action
      }
    }, 10 * 60 * 1000); // Refresh every 10 minutes (access token expires in 15 minutes)

    return () => clearInterval(refreshInterval);
  }, [state.isAuthenticated]);

  const login = async (credentials: LoginCredentials): Promise<void> => {
    try {
      dispatch({ type: 'AUTH_START' });
      
      const data = await authApi.login(credentials);
      
      const user: User = {
        id: data.user_id,
        email: data.user_email,
      };
      
      dispatch({
        type: 'AUTH_SUCCESS',
        payload: { user },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      dispatch({ type: 'AUTH_FAILURE', payload: errorMessage });
      throw error;
    }
  };

  const signup = async (credentials: SignupCredentials): Promise<void> => {
    try {
      dispatch({ type: 'AUTH_START' });
      
      const data = await authApi.signup(credentials);
      
      const user: User = {
        id: data.user_id,
        email: data.user_email,
      };
      
      dispatch({
        type: 'AUTH_SUCCESS',
        payload: { user },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Signup failed';
      dispatch({ type: 'AUTH_FAILURE', payload: errorMessage });
      throw error;
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await logoutApi();
    } finally {
      // Always dispatch logout even if API call fails
      dispatch({ type: 'LOGOUT' });
    }
  };

  const clearError = (): void => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  const contextValue: AuthContextType = {
    ...state,
    login,
    signup,
    logout,
    clearError,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};