import { Router } from "express";
import { buildEodMessage, buildMorningMessage, sendSlackEod, sendSlackRawText } from "../integrations/slack/index.js";
import { getRuntimeSecrets } from "../services/settingsService.js";
import type { GeneratedReport } from "@tasksync/shared/types";
import { asyncHandler } from "../middleware/errors.js";

export const slackRouter = Router();

/** POST /api/slack/preview — build the Block Kit message (no network call). */
slackRouter.post(
  "/preview",
  asyncHandler(async (req, res) => {
    const report = req.body?.report as GeneratedReport | undefined;
    if (!report?.tasks?.length) {
      res.status(400).json({ error: "report with tasks is required" });
      return;
    }
    const isMorning = report.reportType === 'morning'
    const { text, blocks } = isMorning ? buildMorningMessage(report) : buildEodMessage(report);
    res.json({ text, blocks });
  }),
);

/** POST /api/slack/send — deliver EOD or Morning Plan to the configured webhook. */
slackRouter.post(
  "/send",
  asyncHandler(async (req, res) => {
    const secrets = await getRuntimeSecrets();
    if (!secrets.slackWebhookUrl) {
      res.status(400).json({ error: "Slack webhook URL not configured in Settings." });
      return;
    }
    const report = req.body?.report as GeneratedReport | undefined;
    const editedText = typeof req.body?.text === "string" ? req.body.text.trim() : "";
    if (!report?.tasks?.length) {
      res.status(400).json({ error: "report with tasks is required" });
      return;
    }
    if (editedText) {
      await sendSlackRawText(secrets.slackWebhookUrl, editedText);
    } else if (report.reportType === 'morning') {
      const { text, blocks } = buildMorningMessage(report);
      await sendSlackRawText(secrets.slackWebhookUrl, text);
      void blocks; // blocks available if needed later
    } else {
      await sendSlackEod({ webhookUrl: secrets.slackWebhookUrl }, report);
    }
    res.json({ ok: true });
  }),
);
