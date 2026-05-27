import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Landing from './pages/public/Landing'
import Login from './pages/public/Login'
import Register from './pages/public/Register'
import Pending from './pages/public/Pending'
import Dashboard from './pages/Dashboard'

// Investor pages
import Feed from './pages/investor/Feed'
import PitchView from './pages/investor/PitchView'
import MyInterests from './pages/investor/MyInterests'

// Role-based redirect from /dashboard
function DashboardRedirect() {
  const { user } = useAuth()
  if (user?.role === 'investor') return <Navigate to="/investor/feed" replace />
  // Other roles stay on /dashboard (their pages will be added by other devs)
  return <Dashboard />
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/pending" element={<Pending />} />

          {/* Dashboard — redirects investor to feed */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardRedirect />
              </ProtectedRoute>
            }
          />

          {/* Investor routes */}
          <Route
            path="/investor/feed"
            element={
              <ProtectedRoute>
                <Feed />
              </ProtectedRoute>
            }
          />
          <Route
            path="/investor/pitches/:id"
            element={
              <ProtectedRoute>
                <PitchView />
              </ProtectedRoute>
            }
          />
          <Route
            path="/investor/interests"
            element={
              <ProtectedRoute>
                <MyInterests />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
