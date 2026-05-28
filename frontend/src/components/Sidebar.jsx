import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// Left navigation — role-conditional links.
// Investor: Feed, My Interests
// Other roles: placeholder Dashboard link (their pages added by other devs)
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
        {user?.role === 'admin' && (
          <>
            <NavLink to="/admin/dashboard" className={linkClass}>Dashboard</NavLink>
            <NavLink to="/admin/users" className={linkClass}>Users</NavLink>
            <NavLink to="/admin/negotiations" className={linkClass}>Negotiations</NavLink>
          </>
        )}
        {user?.role === 'investor' && (
          <>
            <NavLink to="/investor/feed" className={linkClass}>Browse Pitches</NavLink>
            <NavLink to="/investor/interests" className={linkClass}>My Interests</NavLink>
            <NavLink to="/investor/negotiations" className={linkClass}>Negotiations</NavLink>
          </>
        )}
        {user?.role === 'startup' && (
          <>
            <NavLink to="/startup/dashboard" className={linkClass}>Dashboard</NavLink>
            <NavLink to="/startup/create" className={linkClass}>Create Pitch</NavLink>
            <NavLink to="/startup/pitches" className={linkClass}>My Pitches</NavLink>
            <NavLink to="/startup/negotiations" className={linkClass}>Negotiations</NavLink>
          </>
        )}
      </nav>
      <p className="mt-6 px-4 text-xs text-gray-400">Signed in as {user?.role}</p>
    </aside>
  )
}
