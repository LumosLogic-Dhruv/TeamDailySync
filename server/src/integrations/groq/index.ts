/**
 * Groq integration — OpenAI-compatible chat completions with the shared prompts.
 */
import { buildSystemPrompt, buildUserPrompt } from "@tasksync/shared/constants";
import { parseAiTasks } from "@tasksync/shared/utils/ai-parse";
import type { PromptContext } from "@tasksync/shared/constants";
import type { AiResult } from "../gemini/index.js";

function extractText(data: unknown): string {
  const d = data as { choices?: { message?: { content?: string } }[] }
  return d.choices?.[0]?.message?.content ?? ''
}

export async function callGroq(apiKey: string, ctx: PromptContext, signal?: AbortSignal): Promise<AiResult> {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'llama3-70b-8192',
      temperature: 0.3,
      max_tokens: 4096,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: buildSystemPrompt() },
        { role: 'user', content: buildUserPrompt(ctx) },
      ],
    }),
    signal,
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Groq API error ${res.status}: ${body.slice(0, 300)}`)
  }

  const data = (await res.json()) as unknown
  const parsed = parseAiTasks(extractText(data))
  return { ...parsed, provider: 'groq' }
}

/** Gemini primary, Groq fallback — identical behavior to the previous ai.ts. */
export async function processWorkEntries(
  ctx: PromptContext,
  geminiKey?: string,
  groqKey?: string,
): Promise<AiResult> {
  const { callGemini } = await import('../gemini/index.js')
  const errors: string[] = []

  if (geminiKey) {
    try {
      return await callGemini(geminiKey, ctx)
    } catch (err) {
      errors.push(`Gemini: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  if (groqKey) {
    try {
      return await callGroq(groqKey, ctx)
    } catch (err) {
      errors.push(`Groq: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  throw new Error(
    errors.length > 0
      ? `All AI providers failed — ${errors.join(' | ')}`
      : 'No AI provider API keys configured. Add Gemini or Groq keys in Settings.',
  )
}
