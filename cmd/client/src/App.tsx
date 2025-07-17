import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { LoginPage } from './components/LoginPage'
import { SignupPage } from './components/SignupPage'
import { Layout } from './components/Layout'
import { DashboardPage } from './components/DashboardPage'
import { AgentsPage } from './components/AgentsPage'
import { CreateAgentForm } from './components/CreateAgentForm'
import { AgentDetailView } from './components/AgentDetailView'
import { ChatPage } from './components/ChatPage'
import { ThemeProvider } from './components/theme-provider'
import { AuthProvider } from './auth/AuthContext'
import { ProtectedRoute, PublicRoute } from './auth/ProtectedRoute'
import { Toaster } from './components/ui/sonner'

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
            
            {/* Protected routes with layout */}
            <Route 
              path="/" 
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="agents" element={<AgentsPage />} />
              <Route path="agents/create" element={<CreateAgentForm />} />
              <Route path="agents/:id" element={<AgentDetailView />} />
              <Route path="chat" element={<ChatPage />} />
            </Route>
            
            {/* Catch all route */}
            <Route 
              path="*" 
              element={<Navigate to="/dashboard" replace />}
            />
          </Routes>
        </Router>
        <Toaster 
          position="top-right"
          expand={true}
          richColors={true}
          closeButton={true}
        />
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
