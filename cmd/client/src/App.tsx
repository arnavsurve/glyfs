import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { LoginPage } from './components/LoginPage'
import { SignupPage } from './components/SignupPage'
import { Dashboard } from './components/Dashboard'
import { ThemeProvider } from './components/theme-provider'

// Simple auth check - in a real app you'd use a proper auth context
const isAuthenticated = () => {
  return localStorage.getItem('token') !== null
}

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <Router>
        <Routes>
          {/* Auth routes */}
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/login" element={<LoginPage />} />
          
          {/* Protected routes */}
          <Route 
            path="/dashboard" 
            element={
              isAuthenticated() ? <Dashboard /> : <Navigate to="/login" replace />
            } 
          />
          <Route 
            path="/agents" 
            element={
              isAuthenticated() ? <Dashboard /> : <Navigate to="/login" replace />
            } 
          />
          <Route 
            path="/agents/:id" 
            element={
              isAuthenticated() ? <Dashboard /> : <Navigate to="/login" replace />
            } 
          />
          <Route 
            path="/profile" 
            element={
              isAuthenticated() ? <Dashboard /> : <Navigate to="/login" replace />
            } 
          />
          
          {/* Root redirect */}
          <Route 
            path="/" 
            element={
              isAuthenticated() ? <Navigate to="/dashboard" replace /> : <Navigate to="/signup" replace />
            } 
          />
        </Routes>
      </Router>
    </ThemeProvider>
  )
}

export default App
