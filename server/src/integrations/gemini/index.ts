/**
 * Gemini integration — REST call to generateContent with the shared prompts.
 */
import { buildSystemPrompt, buildUserPrompt } from "@tasksync/shared/constants";
import { parseAiTasks } from "@tasksync/shared/utils/ai-parse";
import type { PromptContext } from "@tasksync/shared/constants";
import type { AiProvider } from "@tasksync/shared/types";

export interface AiResult {
  tasks: ReturnType<typeof parseAiTasks>["tasks"]
  slackSummary?: string
  provider: AiProvider
}

function extractText(data: unknown): string {
  const d = data as {
    candidates?: { content?: { parts?: { text?: string }[] } }[]
  }
  return (
    d.candidates?.[0]?.content?.parts
      ?.map((p) => p.text ?? '')
      .join('') ?? ''
  )
}

export async function callGemini(apiKey: string, ctx: PromptContext, signal?: AbortSignal): Promise<AiResult> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: buildSystemPrompt() }] },
        contents: [{ role: 'user', parts: [{ text: buildUserPrompt(ctx) }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 4096,
          responseMimeType: 'application/json',
        },
      }),
      signal,
    },
  )

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Gemini API error ${res.status}: ${body.slice(0, 300)}`)
  }

  const data = (await res.json()) as unknown
  const parsed = parseAiTasks(extractText(data))
  return { ...parsed, provider: 'gemini' }
}
