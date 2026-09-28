/**
 * TaskSync — shared domain types.
 * Single source of truth used by the web app, the API server and Convex functions.
 */

export type TaskPriority = 'Low' | 'Medium' | 'High' | 'Critical'
export type TaskStatus = 'Done' | 'In Progress' | 'Blocked' | 'Pending'
export type UserRole = 'admin' | 'member'
export type AiProvider = 'gemini' | 'groq'

export interface WorkEntry {
  id: string
  raw: string
  hours?: number
  createdAt: string
}

export interface StructuredTask {
  id: string
  client: string
  project: string
  taskDetails: string[] | string
  priority: TaskPriority
  estimatedTime: string
  timeSpent: string
  output: string
  status: TaskStatus
  completion?: number
  blocker?: string
}

export type ReportType = 'eod' | 'morning'

export interface GeneratedReport {
  employeeName: string
  employeeEmail: string
  date: string
  totalHours: number
  tasks: StructuredTask[]
  reportType?: ReportType
}

export interface SlackEodPayload {
  employeeName?: string
  channel?: string
  date: string
  totalHours: number
  text: string
  blocks: unknown[]
}

export interface TeamMember {
  email: string
  tabName: string
  role?: UserRole
  avatarUrl?: string
}

export interface RedactedSettings {
  hasGeminiKey: boolean
  hasGroqKey: boolean
  hasSheetId: boolean
  hasSlackWebhook: boolean
  hasServiceAccount: boolean
  userMapping: TeamMember[]
  sheetId?: string
}

export interface AiProcessResponse {
  report: GeneratedReport
  slackSummary?: string
  provider: AiProvider
}

export interface SheetPreviewResponse {
  tab: string
  rows: string[][]
}

export interface AuthUser {
  email: string
  name: string
  tabName: string
  role: UserRole
  avatarUrl?: string
}

export interface AiProcessPayload {
  employeeName: string
  employeeEmail: string
  date: string
  totalHours: number
  entries: WorkEntry[]
}

/** Shape stored in the Convex `settings` documents (secrets included). */
export interface AppSecretSettings {
  geminiApiKey?: string
  groqApiKey?: string
  slackWebhookUrl?: string
  googleServiceAccountEmail?: string
  googlePrivateKey?: string
}

export interface AppSettingsDoc extends AppSecretSettings {
  sheetId?: string
  timezone?: string
  activeProvider?: AiProvider
  updatedBy?: string
  updatedAt?: number
}

export interface SaveSettingsPayload extends Partial<AppSecretSettings> {
  sheetId?: string
  timezone?: string
  activeProvider?: AiProvider
  userMapping?: TeamMember[]
}
