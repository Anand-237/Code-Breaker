import { createContext, useContext, useState, useEffect } from 'react'
import api from '../api/axios'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(() => {
    // Clear legacy localStorage token so stale sessions do not persist across users
    try { localStorage.removeItem('cb_token') } catch (_) {}
    try { return sessionStorage.getItem('cb_token') || null } catch (_) { return null }
  })
  const [loading, setLoading] = useState(true)

  // Bootstrap user from stored token on app load
  useEffect(() => {
    const init = async () => {
      if (!token) {
        setLoading(false)
        return
      }
      try {
        const { data } = await api.get('/auth/me')
        setUser(data.user)
      } catch {
        // Token invalid/expired
        try {
          sessionStorage.removeItem('cb_token')
          localStorage.removeItem('cb_token')
        } catch (_) {}
        setToken(null)
        setUser(null)
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [token])

  const login = async (username, password) => {
    const { data } = await api.post('/auth/login', { username, password })
    try {
      sessionStorage.setItem('cb_token', data.token)
      localStorage.removeItem('cb_token')
    } catch (_) {}
    setToken(data.token)
    setUser(data.user)
    return data.user
  }

  const logout = async () => {
    try { await api.post('/auth/logout') } catch { /* ignore */ }
    try {
      sessionStorage.removeItem('cb_token')
      localStorage.removeItem('cb_token')
    } catch (_) {}
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading, isAdmin: user?.role === 'admin' }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
