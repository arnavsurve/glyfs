import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { LoginPage } from './components/LoginPage'
import { SignupPage } from './components/SignupPage'
import { Dashboard } from './components/Dashboard'
import { ThemeProvider } from './components/theme-provider'
import { AuthProvider } from './auth/AuthContext'
import { ProtectedRoute, PublicRoute } from './auth/ProtectedRoute'

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <AuthProvider>
        <Router>
          <Routes>
            {/* Public routes - redirect to dashboard if authenticated */}
            <Route 
              path="/signup" 
              element={
                <PublicRoute>
                  <SignupPage />
                </PublicRoute>
              } 
            />
            <Route 
              path="/login" 
              element={
                <PublicRoute>
                  <LoginPage />
                </PublicRoute>
              } 
            />
            
            {/* Protected routes - require authentication */}
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/agents" 
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/agents/:id" 
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/profile" 
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            
            {/* Root redirect based on auth status */}
            <Route 
              path="/" 
              element={<Navigate to="/dashboard" replace />}
            />
            
            {/* Catch all route */}
            <Route 
              path="*" 
              element={<Navigate to="/dashboard" replace />}
            />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
