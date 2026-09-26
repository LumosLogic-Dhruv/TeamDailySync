import * as React from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Sparkles, Clock, ArrowRight, ShieldCheck } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { toast } from '@/hooks/use-toast'

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: object) => void
          renderButton: (el: HTMLElement, config: object) => void
          prompt: () => void
        }
      }
    }
  }
}

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? ''

export function LoginPage() {
  const { signIn, user } = useAuth()
  const navigate = useNavigate()
  const btnRef = React.useRef<HTMLDivElement>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(false)

  if (user) return <Navigate to="/" replace />

  React.useEffect(() => {
    const init = () => {
      if (!window.google || !btnRef.current) return
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async (response: { credential: string }) => {
          setLoading(true)
          setError(null)
          try {
            // Decode JWT payload to get email + name + picture
            const payload = JSON.parse(atob(response.credential.split('.')[1])) as {
              email: string
              name: string
              picture: string
            }
            await signIn(payload.email, payload.name, payload.picture)
            toast({ title: 'Welcome 👋', description: 'Signed in successfully.' })
            navigate('/', { replace: true })
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Sign in failed')
          } finally {
            setLoading(false)
          }
        },
      })
      window.google.accounts.id.renderButton(btnRef.current, {
        theme: 'outline',
        size: 'large',
        width: btnRef.current.offsetWidth || 360,
        text: 'continue_with',
        shape: 'rectangular',
      })
    }

    // Google script may already be loaded or still loading
    if (window.google) {
      init()
    } else {
      const interval = setInterval(() => {
        if (window.google) { clearInterval(interval); init() }
      }, 100)
      return () => clearInterval(interval)
    }
  }, [])

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-4">
      <div className="pointer-events-none absolute inset-0 bg-grid" />
      <div className="pointer-events-none absolute -top-32 left-1/2 h-96 w-[36rem] -translate-x-1/2 rounded-full bg-primary/25 blur-[128px]" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-72 w-72 rounded-full bg-sky-500/15 blur-[100px]" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="glass-strong relative z-10 w-full max-w-md rounded-2xl p-8 shadow-2xl"
      >
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl overflow-hidden shadow-lg shadow-primary/30">
            <img src="/logo.png" alt="AI Daily Sync" className="h-full w-full object-contain" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">AI Daily Sync</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Automate your EOD reports to Slack &amp; Google Sheets
          </p>
        </div>

        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-3 text-sm text-muted-foreground">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Signing in...
            </div>
          ) : (
            <div ref={btnRef} className="w-full" />
          )}

          {error && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {error}
            </motion.p>
          )}
        </div>

        <div className="mt-6 space-y-2 text-center text-xs text-muted-foreground">
          <p className="flex items-center justify-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5" />
            Only team members can sign in
          </p>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-3 border-t pt-5 text-center text-xs text-muted-foreground">
          <div className="flex flex-col items-center gap-1">
            <Sparkles className="h-4 w-4 text-primary" />
            AI reports
          </div>
          <div className="flex flex-col items-center gap-1">
            <Clock className="h-4 w-4 text-primary" />
            Auto-sheet sync
          </div>
          <div className="flex flex-col items-center gap-1">
            <ArrowRight className="h-4 w-4 text-primary" />
            One-click Slack
          </div>
        </div>
      </motion.div>
    </div>
  )
}
