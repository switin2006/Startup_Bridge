import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// Wraps any route that requires a logged-in user.
// While the session is being restored, shows a loading screen.
// If there's no user, redirects to /login.
export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        Loading…
      </div>
    )
  }
  if (!user) {
    return <Navigate to="/login" replace />
  }
  return children
}
