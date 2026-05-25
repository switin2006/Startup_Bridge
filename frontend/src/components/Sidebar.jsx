import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// Left navigation. For now only Dashboard exists — later phases add
// role-specific links (pitches, interests, negotiations, admin).
export default function Sidebar() {
  const { user } = useAuth()

  const linkClass = ({ isActive }) =>
    `block px-4 py-2 rounded-lg text-sm ${
      isActive
        ? 'bg-indigo-50 text-indigo-700 font-medium'
        : 'text-gray-600 hover:bg-gray-100'
    }`

  return (
    <aside className="w-56 bg-white border-r border-gray-200 p-4">
      <nav className="space-y-1">
        <NavLink to="/dashboard" className={linkClass}>
          Dashboard
        </NavLink>
        {/* More links added in later phases */}
      </nav>
      <p className="mt-6 px-4 text-xs text-gray-400">Signed in as {user?.role}</p>
    </aside>
  )
}
