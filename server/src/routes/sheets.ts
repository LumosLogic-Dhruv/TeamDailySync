import { Router } from "express";
import {
  appendReportRows,
  ensureEmployeeTab,
  readEmployeeTab,
} from "../integrations/sheets/index.js";
import type { SheetsConfig } from "../integrations/sheets/index.js";
import { getRuntimeSecrets } from "../services/settingsService.js";
import type { AuthedRequest } from "../middleware/auth.js";
import type { GeneratedReport } from "@tasksync/shared/types";
import { asyncHandler } from "../middleware/errors.js";

export const sheetsRouter = Router();

async function requireSheetsConfig(): Promise<SheetsConfig> {
  const s = await getRuntimeSecrets();
  if (!s.sheetId || !s.serviceAccountEmail || !s.privateKey) {
    throw Object.assign(
      new Error(
        "Google Sheets not configured. Set Sheet ID and Google service account credentials in Settings.",
      ),
      { status: 400 },
    );
  }
  return {
    sheetId: s.sheetId,
    employeeTab: "",
    serviceAccountEmail: s.serviceAccountEmail,
    privateKey: s.privateKey,
  };
}

/** GET /api/sheets/preview?tab= — read rows from an employee tab. */
sheetsRouter.get(
  "/preview",
  asyncHandler(async (req, res) => {
    const config = await requireSheetsConfig();
    const tab = String(req.query.tab ?? "");
    if (!tab) {
      res.status(400).json({ error: "tab query param is required" });
      return;
    }
    const rows = await readEmployeeTab({ ...config, employeeTab: tab });
    res.json({ tab, rows });
  }),
);

/** POST /api/sheets/append — append one row per task to the user's tab. */
sheetsRouter.post(
  "/append",
  asyncHandler(async (req: AuthedRequest, res) => {
    const config = await requireSheetsConfig();
    const report = req.body?.report as GeneratedReport | undefined;
    if (!report?.employeeName || !report?.tasks?.length) {
      res.status(400).json({ error: "report with tasks is required" });
      return;
    }
    const tab = String(req.body?.tab ?? report.employeeName);
    const result = await appendReportRows({ ...config, employeeTab: tab }, report);
    res.json({ ok: true, appended: result.appended, tab });
  }),
);

/** POST /api/sheets/ensure-tab — create the tab with headers if missing. */
sheetsRouter.post(
  "/ensure-tab",
  asyncHandler(async (req, res) => {
    const config = await requireSheetsConfig();
    const tab = String(req.body?.tab ?? "");
    if (!tab) {
      res.status(400).json({ error: "tab is required" });
      return;
    }
    await ensureEmployeeTab({ ...config, employeeTab: tab });
    res.json({ ok: true, tab });
  }),
);
