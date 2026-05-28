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
import InvestorNegotiations from './pages/investor/Negotiations'

// Admin pages
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminUsers from './pages/admin/AdminUsers'
import AdminNegotiations from './pages/admin/AdminNegotiations'
import AdminMessages from './pages/admin/AdminMessages'

// startup pages
import StartupDashboard from './pages/startup/StartupDashboard'
import CreatePitch from './pages/startup/CreatePitch'
import MyPitches from './pages/startup/MyPitches'
import PitchDetails from './pages/startup/PitchDetails'
import Negotiations from './pages/startup/Negotiations'
import NegotiationChat from './pages/shared/NegotiationChat'

// Role-based redirect from /dashboard
function DashboardRedirect() {
  const { user } = useAuth()

  if (user?.role === 'investor') {
    return <Navigate to="/investor/feed" replace />
  }

  if (user?.role === 'admin') {
    return <Navigate to="/admin/dashboard" replace />
  }

  if (user?.role === 'startup') {
    return <Navigate to="/startup/dashboard" replace />
  }

  return <Navigate to="/login" replace />
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

          {/* Admin routes */}
          <Route path="/admin/dashboard" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/users" element={<ProtectedRoute><AdminUsers /></ProtectedRoute>} />
          <Route path="/admin/negotiations" element={<ProtectedRoute><AdminNegotiations /></ProtectedRoute>} />
          <Route path="/admin/negotiations/:id/messages" element={<ProtectedRoute><AdminMessages /></ProtectedRoute>} />

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
          <Route
            path="/investor/negotiations"
            element={
              <ProtectedRoute>
                <InvestorNegotiations />
              </ProtectedRoute>
            }
          />
          <Route
            path="/startup/dashboard"
            element={
              <ProtectedRoute>
                <StartupDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/startup/create"
            element={
              <ProtectedRoute>
                <CreatePitch />
              </ProtectedRoute>
            }
          />

          <Route
            path="/startup/pitches"
            element={
              <ProtectedRoute>
                <MyPitches />
              </ProtectedRoute>
            }
          />

          <Route
            path="/startup/pitches/:id"
            element={
              <ProtectedRoute>
                <PitchDetails />
              </ProtectedRoute>
            }
          />

          <Route
            path="/startup/negotiations"
            element={
              <ProtectedRoute>
                <Negotiations />
              </ProtectedRoute>
            }
          />

          <Route
            path="/negotiation/:id"
            element={
              <ProtectedRoute>
                <NegotiationChat />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
