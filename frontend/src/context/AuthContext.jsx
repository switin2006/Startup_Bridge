import { createContext, useContext, useState, useEffect } from 'react'
import api from '../api'

// AuthContext holds the logged-in user and exposes login/register/logout.
// Any component can read it with the useAuth() hook.
const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // On first load: if a token is in localStorage, restore the session
  // by asking the backend who we are.
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      setLoading(false)
      return
    }
    api
      .get('/auth/me')
      .then((res) => setUser(res.data.user))
      .catch(() => localStorage.removeItem('token')) // bad/expired token
      .finally(() => setLoading(false))
  }, [])

  async function login(email, password) {
    const res = await api.post('/auth/login', { email, password })
    localStorage.setItem('token', res.data.token)
    setUser(res.data.user)
    return res.data.user
  }

  async function register(data) {
    const res = await api.post('/auth/register', data)
    return res.data
  }

  function logout() {
    localStorage.removeItem('token')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext)
}
