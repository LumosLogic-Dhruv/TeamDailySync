/**
 * Local data layer — instant UI cache with server (Convex) persistence.
 *
 * The pages keep their exact synchronous UX: reads return the cached value
 * immediately, writes update the cache and fire-and-forget a sync to the API
 * (which persists to Convex). On sign-in, the server draft hydrates the cache.
 */
import { api } from './api'
import type { GeneratedReport, WorkEntry } from './types'

const ENTRIES_KEY = 'ai-daily-sync-entries'
const REPORT_KEY = 'ai-daily-sync-report'
const METRICS_KEY = 'ai-daily-sync-metrics'

function currentUserEmail(): string | undefined {
  try {
    const raw = localStorage.getItem('ai-daily-sync-user')
    if (!raw) return undefined
    return ((JSON.parse(raw) as { email?: string }).email || undefined)?.toLowerCase()
  } catch {
    return undefined
  }
}

/* ------------------------------ work entries ----------------------------- */

export function loadEntries(): WorkEntry[] {
  try {
    const raw = localStorage.getItem(ENTRIES_KEY)
    return raw ? (JSON.parse(raw) as WorkEntry[]) : []
  } catch {
    return []
  }
}

export function saveEntries(entries: WorkEntry[]) {
  try {
    localStorage.setItem(ENTRIES_KEY, JSON.stringify(entries))
  } catch {
    // storage full/unavailable
  }
  // Fire-and-forget persistence of quick-adds to Convex.
  const email = currentUserEmail()
  const last = entries[entries.length - 1]
  if (email && last) {
    void api.addDraftEntry(email, last.raw).catch(() => {})
  }
}

/** Hydrate the cache from the user's Convex draft (call once after sign-in). */
export async function hydrateFromServer(): Promise<void> {
  const email = currentUserEmail()
  if (!email) return
  try {
    const draft = await api.getDraft(email)
    if (draft.content) {
      const existing = loadEntries()
      const hasFreeform = existing.some((e) => e.id.startsWith('freeform-'))
      if (!hasFreeform) {
        const entry: WorkEntry = {
          id: `freeform-server`,
          raw: draft.content,
          createdAt: new Date().toISOString(),
        }
        saveEntries([...existing.filter((e) => e.id !== 'freeform-server'), entry])
      }
    }
  } catch {
    // offline / not signed in — cache stays as-is
  }
}

/* ------------------------------ last report ------------------------------ */

export function loadLastReport(): GeneratedReport | null {
  try {
    const raw = localStorage.getItem(REPORT_KEY)
    return raw ? (JSON.parse(raw) as GeneratedReport) : null
  } catch {
    return null
  }
}

export function saveLastReport(report: GeneratedReport) {
  try {
    localStorage.setItem(REPORT_KEY, JSON.stringify(report))
  } catch {
    // ignore
  }
  // The full report is persisted server-side by /api/ai/process (Convex).
}

export function clearLastReport() {
  try {
    localStorage.removeItem(REPORT_KEY)
  } catch {
    // ignore
  }
}

/* -------------------------------- metrics -------------------------------- */

export interface LocalMetrics {
  lastSentDate?: string
  entriesLogged: number
  reportsGenerated: number
  slackSent: number
  sheetUpdates: number
}

export function loadMetrics(): LocalMetrics {
  try {
    const raw = localStorage.getItem(METRICS_KEY)
    return (
      raw
        ? (JSON.parse(raw) as LocalMetrics)
        : { entriesLogged: 0, reportsGenerated: 0, slackSent: 0, sheetUpdates: 0 }
    )
  } catch {
    return { entriesLogged: 0, reportsGenerated: 0, slackSent: 0, sheetUpdates: 0 }
  }
}

export function saveMetrics(m: LocalMetrics) {
  try {
    localStorage.setItem(METRICS_KEY, JSON.stringify(m))
  } catch {
    // ignore
  }
}

export function todayIso(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
