import type {
  AiProcessResponse,
  AuthUser,
  GeneratedReport,
  RedactedSettings,
  SheetPreviewResponse,
  WorkEntry,
} from './types'

const API_BASE = import.meta.env.VITE_API_URL ?? ''

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  if (!res.ok) {
    let message = `Request failed (${res.status})`
    try {
      const data = (await res.json()) as { error?: string }
      if (data.error) message = data.error
    } catch {
      // keep default message
    }
    throw new Error(message)
  }
  return (await res.json()) as T
}

/** Attach the signed-in user's email so the server can resolve the Convex user. */
function authInit(email: string | undefined, init?: RequestInit): RequestInit {
  return {
    ...init,
    headers: { ...(init?.headers ?? {}), ...(email ? { 'x-tasksync-email': email } : {}) },
  }
}

export const api = {
  authVerify: (email: string, name?: string, picture?: string) =>
    request<AuthUser>('/api/auth/verify', {
      method: 'POST',
      body: JSON.stringify({ email, name, picture }),
    }),

  getTeam: () => request<{ mapping: { email: string; tabName: string }[] }>('/api/team'),

  getSettings: () => request<RedactedSettings>('/api/settings'),

  saveSettings: (payload: Record<string, unknown>) =>
    request<RedactedSettings>('/api/settings', { method: 'POST', body: JSON.stringify(payload) }),

  processAi: (payload: {
    employeeName: string
    employeeEmail: string
    date: string
    totalHours: number
    entries: WorkEntry[]
  }) => request<AiProcessResponse>('/api/ai/process', { method: 'POST', body: JSON.stringify(payload) }),

  sheetsPreview: (tab: string) =>
    request<SheetPreviewResponse>(`/api/sheets/preview?tab=${encodeURIComponent(tab)}`),

  sheetsAppend: (tab: string, report: GeneratedReport) =>
    request<{ ok: boolean; appended: number; tab: string }>('/api/sheets/append', {
      method: 'POST',
      body: JSON.stringify({ tab, report }),
    }),

  sheetsEnsureTab: (tab: string) =>
    request<{ ok: boolean; tab: string }>('/api/sheets/ensure-tab', {
      method: 'POST',
      body: JSON.stringify({ tab }),
    }),

  slackPreview: (report: GeneratedReport) =>
    request<{ text: string; blocks: unknown[] }>('/api/slack/preview', {
      method: 'POST',
      body: JSON.stringify({ report }),
    }),

  slackSend: (report: GeneratedReport, editedText?: string) =>
    request<{ ok: boolean }>('/api/slack/send', {
      method: 'POST',
      body: JSON.stringify({ report, text: editedText }),
    }),

  // ---- Drafts (persisted in Convex; replaces localStorage-only drafts) ----

  getDraft: (email: string) =>
    request<{ content: string; updatedAt: number | null }>(
      '/api/drafts',
      authInit(email),
    ),

  saveDraft: (email: string, content: string) =>
    request<{ ok: boolean }>('/api/drafts', {
      ...authInit(email, { method: 'PUT', body: JSON.stringify({ content }) }),
    }),

  addDraftEntry: (email: string, entry: string) =>
    request<{ ok: boolean }>('/api/drafts/entries', {
      ...authInit(email, { method: 'POST', body: JSON.stringify({ entry }) }),
    }),
}
