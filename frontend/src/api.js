import axios from 'axios'

// All requests go to /api/* — Vite's dev proxy (vite.config.js) forwards
// these to the Express backend on http://localhost:4000.
const api = axios.create({
  baseURL: '/api',
})

// Request interceptor — attach the JWT to every request if we have one.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export default api
