import * as React from 'react'
import { api } from './api'
import type { AuthUser } from './types'

interface AuthContextValue {
  user: AuthUser | null
  loading: boolean
  signIn: (email: string, name?: string, picture?: string) => Promise<void>
  signOut: () => void
}

const AuthContext = React.createContext<AuthContextValue | null>(null)

const STORAGE_KEY = 'ai-daily-sync-user'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<AuthUser | null>(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setUser(JSON.parse(raw) as AuthUser)
    } catch {
      // ignore corrupt storage
    }
    setLoading(false)
  }, [])

  const signIn = React.useCallback(async (email: string, name?: string, picture?: string) => {
    const verified = await api.authVerify(email, name, picture)
    setUser(verified)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(verified))
  }, [])

  const signOut = React.useCallback(() => {
    setUser(null)
    localStorage.removeItem(STORAGE_KEY)
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = React.useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
