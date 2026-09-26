/**
 * Report service — persists every AI-generated report to Convex,
 * replacing "Google Sheets as the only storage" for application history.
 */
import { convexMutation, convexQuery } from "../lib/convex.js";
import type { GeneratedReport } from "@tasksync/shared/types";

export interface StoredReport {
  _id: string
  userId: string
  rawInput: string
  generatedSlackMessage?: string
  generatedSheetRows: {
    client: string
    project: string
    taskDetails: string[]
    priority: string
    estimatedTime: string
    timeSpent: string
    output: string
    status: string
  }[]
  provider?: string
  date: string
  totalHours: number
  createdAt: number
}

export async function saveReport(input: {
  userId: string
  report: GeneratedReport
  rawInput: string
  slackSummary?: string
  provider?: string
}): Promise<string> {
  return (await convexMutation("reports:create", {
    userId: input.userId,
    rawInput: input.rawInput,
    generatedSlackMessage: input.slackSummary,
    generatedSheetRows: input.report.tasks.map((t) => ({
      client: t.client,
      project: t.project,
      taskDetails: Array.isArray(t.taskDetails) ? t.taskDetails : [String(t.taskDetails)],
      priority: t.priority,
      estimatedTime: t.estimatedTime,
      timeSpent: t.timeSpent,
      output: t.output,
      status: t.status,
    })),
    provider: input.provider,
    date: input.report.date,
    totalHours: input.report.totalHours,
  })) as string;
}

export async function listReportsForUser(userId: string, limit = 20): Promise<StoredReport[]> {
  return (await convexQuery("reports:listForUser", { userId, limit })) as StoredReport[];
}
