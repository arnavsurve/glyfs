import React from "react";
import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";

interface ProtectedRouteProps {
  children: ReactNode;
  redirectTo?: string;
  requireAuth?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  redirectTo = "/login",
  requireAuth = true,
}) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  // If route requires authentication and user is not authenticated
  if (requireAuth && !isAuthenticated) {
    // Save the attempted location for redirecting after login
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // If route requires no authentication (like login page) and user is authenticated
  if (!requireAuth && isAuthenticated) {
    // Redirect to dashboard or the originally intended location
    const from = location.state?.from?.pathname || "/app/dashboard";
    return <Navigate to={from} replace />;
  }

  return <>{children}</>;
};

// Convenience component for public routes (login, signup)
export const PublicRoute: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  return (
    <ProtectedRoute requireAuth={false} redirectTo="/app/dashboard">
      {children}
    </ProtectedRoute>
  );
};

// Landing page route - shows landing for unauthenticated, redirects authenticated to dashboard
export const LandingRoute: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const { isAuthenticated, isLoading } = useAuth();

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  // If user is authenticated, redirect to dashboard
  if (isAuthenticated) {
    return <Navigate to="/app/dashboard" replace />;
  }

  // Show landing page for unauthenticated users
  return <>{children}</>;
};
