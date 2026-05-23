import React, { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)

function parseJwt(token) {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(window.atob(base64))
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)

  useEffect(() => {
    const stored = localStorage.getItem('token')
    if (stored) {
      const payload = parseJwt(stored)
      if (payload && payload.exp * 1000 > Date.now()) {
        setToken(stored)
        setUser({ id: payload.sub, email: payload.email, role: payload.role })
      } else {
        localStorage.removeItem('token')
      }
    }
  }, [])

  const login = (newToken) => {
    localStorage.setItem('token', newToken)
    const payload = parseJwt(newToken)
    setToken(newToken)
    setUser({ id: payload.sub, email: payload.email, role: payload.role })
  }

  const logout = () => {
    localStorage.removeItem('token')
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
