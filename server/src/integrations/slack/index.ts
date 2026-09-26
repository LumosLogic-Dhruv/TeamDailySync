/**
 * Slack integration — Block Kit EOD message builder + incoming-webhook sender.
 * Message format is identical to the previous implementation (no UX change).
 */
import type { GeneratedReport } from "@tasksync/shared/types";

export interface SlackConfig {
  webhookUrl: string
}

interface SlackBlock {
  type: string
  text?: { type: string; text: string; emoji?: boolean }
  fields?: { type: string; text: string }[]
  elements?: unknown[]
}

function statusEmoji(status: string): string {
  switch (status.toLowerCase()) {
    case 'done':
      return '✅'
    case 'in progress':
      return '🔄'
    case 'blocked':
      return '⛔'
    default:
      return '⏳'
  }
}

/** Build the exact Slack EOD message as Block Kit blocks + plain-text fallback. */
export function buildEodMessage(report: GeneratedReport): { text: string; blocks: SlackBlock[] } {
  const hours = Number.isInteger(report.totalHours)
    ? String(report.totalHours)
    : report.totalHours.toFixed(1)

  const blocks: SlackBlock[] = [
    {
      type: 'header',
      text: { type: 'plain_text', text: `EOD : ${hours} Hr`, emoji: true },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*${report.employeeName}* — ${report.date}`,
      },
    },
  ]

  const plainLines: string[] = [`EOD : ${hours} Hr`, '', `${report.employeeName} — ${report.date}`]

  for (const task of report.tasks) {
    const title = `${task.project} ${statusEmoji(task.status)} ${task.status}`
    blocks.push({ type: 'divider' })
    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text: `*${title}*` },
    })

    plainLines.push('', title)
    const details = Array.isArray(task.taskDetails) ? task.taskDetails : [String(task.taskDetails)]
    if (task.client && task.client !== 'Lumos Logic') {
      const clientLine = `_Client: ${task.client}_`
      blocks.push({
        type: 'section',
        text: { type: 'mrkdwn', text: clientLine },
      })
      plainLines.push(clientLine.replace(/_/g, ''))
    }

    const bullets = details.map((d) => `- ${d}`)
    if (bullets.length > 0) {
      blocks.push({
        type: 'section',
        text: { type: 'mrkdwn', text: bullets.join('\n') },
      })
      plainLines.push(...bullets)
    }
  }

  const text = plainLines.join('\n')
  return { text, blocks }
}

/** POST the EOD message to the configured Slack Incoming Webhook. */
export async function sendSlackEod(config: SlackConfig, report: GeneratedReport): Promise<void> {
  const { text, blocks } = buildEodMessage(report)

  const res = await fetch(config.webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, blocks }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Slack webhook error ${res.status}: ${body.slice(0, 300)}`)
  }
}

/** Send plain text as-is (used when the user edited the message before sending). */
export async function sendSlackRawText(webhookUrl: string, text: string): Promise<void> {
  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Slack webhook error ${res.status}: ${body.slice(0, 300)}`)
  }
}
