import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// Top bar — shows the app name, current user, and a logout button.
export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      <h1 className="text-lg font-bold text-indigo-600">StartupBridge</h1>
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-600">
          {user?.name} <span className="text-gray-400">({user?.role})</span>
        </span>
        <button onClick={handleLogout} className="text-sm text-red-600 hover:underline">
          Logout
        </button>
      </div>
    </header>
  )
}
