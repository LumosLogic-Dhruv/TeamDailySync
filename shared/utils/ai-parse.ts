/** Tolerant parser for AI JSON responses (used by Gemini + Groq integrations). */
import type { StructuredTask } from '../types/index.js'
import { VALID_PRIORITIES, VALID_STATUSES } from '../constants/index.js'

export function parseAiTasks(
  raw: string,
): { tasks: StructuredTask[]; slackSummary?: string } {
  let cleaned = raw.trim()
  // Strip markdown fences if present
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '')

  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start === -1 || end === -1) {
    throw new Error('AI response did not contain JSON')
  }
  const json = JSON.parse(cleaned.slice(start, end + 1)) as Record<string, unknown>

  const tasks: StructuredTask[] = (Array.isArray(json.tasks) ? json.tasks : []).map(
    (t: Record<string, unknown>, i: number) => {
      const priority = String(t.priority ?? 'Medium')
      const status = String(t.status ?? 'Done')
      const completion = Number(t.completion ?? (status === 'Done' ? 100 : 50))
      const details = Array.isArray(t.taskDetails)
        ? t.taskDetails.map(String)
        : typeof t.taskDetails === 'string'
          ? String(t.taskDetails)
              .split(/\n|;/)
              .map((s) => s.trim())
              .filter(Boolean)
          : []

      return {
        id: `task-${Date.now()}-${i}`,
        client: String(t.client ?? 'Lumos Logic'),
        project: String(t.project ?? 'General'),
        taskDetails: details,
        priority: (VALID_PRIORITIES.includes(priority as (typeof VALID_PRIORITIES)[number])
          ? priority
          : 'Medium') as StructuredTask['priority'],
        estimatedTime: String(t.estimatedTime ?? ''),
        timeSpent: String(t.timeSpent ?? ''),
        output: String(t.output ?? ''),
        status: (VALID_STATUSES.includes(status as (typeof VALID_STATUSES)[number])
          ? status
          : 'Done') as StructuredTask['status'],
        completion: Number.isFinite(completion) ? completion : 50,
      }
    },
  )

  if (tasks.length === 0) {
    throw new Error('AI returned no tasks')
  }

  return { tasks, slackSummary: json.slackSummary ? String(json.slackSummary) : undefined }
}
