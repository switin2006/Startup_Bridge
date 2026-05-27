// NotificationBell — polls GET /api/notifications?unread=true every 30s.
// Shows badge count. Click opens a dropdown. Click notification → mark read + navigate.
import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([])
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const ref = useRef(null)

  // Poll every 30 seconds
  useEffect(() => {
    let cancelled = false

    async function fetchNotifications() {
      try {
        const res = await api.get('/notifications?unread=true')
        if (!cancelled) setNotifications(res.data.notifications)
      } catch {
        // silently ignore — user may not be authenticated yet
      }
    }

    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30000)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function handleClick(notification) {
    try {
      await api.put(`/notifications/${notification.id}/read`)
      setNotifications((prev) => prev.filter((n) => n.id !== notification.id))
    } catch {
      // ignore
    }
    setOpen(false)
    if (notification.linkUrl) navigate(notification.linkUrl)
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 text-gray-500 hover:text-gray-700 transition"
      >
        {/* Bell icon */}
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {notifications.length > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-xs w-4.5 h-4.5 flex items-center justify-center rounded-full text-[10px] font-bold min-w-[18px] h-[18px]">
            {notifications.length > 9 ? '9+' : notifications.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-200 z-50 max-h-96 overflow-y-auto">
          <div className="px-4 py-3 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
          </div>
          {notifications.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-gray-400">
              No new notifications
            </div>
          ) : (
            notifications.map((n) => (
              <button
                key={n.id}
                onClick={() => handleClick(n)}
                className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-50 transition"
              >
                <p className="text-sm font-medium text-gray-900">{n.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">{n.body}</p>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
