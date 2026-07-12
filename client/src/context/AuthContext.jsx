import { useState, useEffect } from 'react'
import api from '../api'
import { AuthContext } from './useAuth'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      Promise.resolve().then(() => setLoading(false))
      return
    }
    api
      .get('/auth/me')
      .then((res) => setUser(res.data.user))
      .catch((err) => {
        const status = err.response?.status
        if (status === 401 || status === 403) localStorage.removeItem('token')
      })
      .finally(() => setLoading(false))
  }, [])

  function login(token, userData) {
    localStorage.setItem('token', token)
    setUser(userData)
  }

  function logout() {
    localStorage.removeItem('token')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}


