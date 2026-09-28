import { Router } from "express";
import { getRuntimeSecrets } from "../services/settingsService.js";
import { findUserIdByEmail } from "../services/userService.js";
import { saveReport } from "../services/reportService.js";
import { processWorkEntries } from "../integrations/groq/index.js";
import { KNOWN_CLIENTS } from "@tasksync/shared/constants";
import type { PromptContext } from "@tasksync/shared/constants";
import type { AuthedRequest } from "../middleware/auth.js";
import type { AiProcessResponse, WorkEntry, ReportType } from "@tasksync/shared/types";
import { asyncHandler } from "../middleware/errors.js";

export const aiRouter = Router();

aiRouter.post(
  "/process",
  asyncHandler(async (req: AuthedRequest, res) => {
    const { employeeName, employeeEmail, date, totalHours, entries, reportType } = req.body as {
      employeeName?: string
      employeeEmail?: string
      date?: string
      totalHours?: number
      entries?: WorkEntry[]
      reportType?: ReportType
    };

    if (!employeeName || !employeeEmail || !date || !entries?.length) {
      res.status(400).json({ error: "employeeName, employeeEmail, date and entries are required" });
      return;
    }

    const secrets = await getRuntimeSecrets();
    const ctx: PromptContext = {
      employeeName,
      employeeEmail,
      date,
      totalHours: Number(totalHours ?? 0),
      entries,
      knownClients: [...KNOWN_CLIENTS],
    };

    const result = await processWorkEntries(ctx, secrets.geminiApiKey, secrets.groqApiKey, reportType);

    const report = {
      employeeName,
      employeeEmail,
      date,
      totalHours: Number(totalHours ?? 0),
      tasks: result.tasks,
      reportType: reportType ?? 'eod' as ReportType,
    };

    if (req.user) {
      try {
        const userId = await findUserIdByEmail(req.user.email);
        if (userId) {
          await saveReport({
            userId,
            report,
            rawInput: entries.map((e) => e.raw).join("\n"),
            slackSummary: result.slackSummary,
            provider: result.provider,
          });
        }
      } catch (err) {
        console.warn("[tasksync] Failed to persist report:", err);
      }
    }

    const response: AiProcessResponse = {
      report,
      slackSummary: result.slackSummary,
      provider: result.provider,
    };
    res.json(response);
  }),
);
