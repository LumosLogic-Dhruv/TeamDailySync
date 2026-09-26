/**
 * Google Sheets integration — service-account JWT client.
 * Google Sheets remains the EOD delivery target (one row per task in each
 * employee's tab); all application state lives in Convex.
 */
import { google } from "googleapis";
import { SHEET_COLUMNS } from "@tasksync/shared/constants";
import type { GeneratedReport } from "@tasksync/shared/types";

export interface SheetsConfig {
  sheetId: string
  employeeTab: string
  serviceAccountEmail: string
  privateKey: string
}

function getJwt(config: SheetsConfig) {
  return new google.auth.JWT({
    email: config.serviceAccountEmail,
    key: config.privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

/** Ensure the employee's tab exists; create it with header row if missing. */
export async function ensureEmployeeTab(config: SheetsConfig): Promise<void> {
  const auth = getJwt(config);
  const sheets = google.sheets({ version: "v4", auth });

  const meta = await sheets.spreadsheets.get({ spreadsheetId: config.sheetId });
  const titles = (meta.data.sheets ?? [])
    .map((s) => s.properties?.title)
    .filter(Boolean) as string[];

  if (titles.includes(config.employeeTab)) return;

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: config.sheetId,
    requestBody: {
      requests: [{ addSheet: { properties: { title: config.employeeTab, rightToLeft: false } } }],
    },
  });

  await sheets.spreadsheets.values.update({
    spreadsheetId: config.sheetId,
    range: `'${config.employeeTab}'!A1`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [[...SHEET_COLUMNS]] },
  });
}

/** Append one row per task to the employee's tab, replacing any rows for the same date. */
export async function appendReportRows(
  config: SheetsConfig,
  report: GeneratedReport,
): Promise<{ appended: number }> {
  await ensureEmployeeTab(config);

  const auth = getJwt(config);
  const sheets = google.sheets({ version: "v4", auth });

  // Read only column A to find existing rows and the next empty row
  const colA = await sheets.spreadsheets.values.get({
    spreadsheetId: config.sheetId,
    range: `'${config.employeeTab}'!A:A`,
  });
  const colAValues = colA.data.values ?? [];

  // Find rows matching today's date (1-based, skip header row 1)
  const rowsToDelete = colAValues
    .map((row, i) => ({ val: row[0], index: i + 1 }))
    .filter(({ val, index }) => index > 1 && val === report.date)
    .map(({ index }) => index)
    .reverse();

  if (rowsToDelete.length > 0) {
    const sheetMeta = await sheets.spreadsheets.get({ spreadsheetId: config.sheetId });
    const sheetId = sheetMeta.data.sheets?.find(
      (s) => s.properties?.title === config.employeeTab,
    )?.properties?.sheetId ?? 0;

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: config.sheetId,
      requestBody: {
        requests: rowsToDelete.map((rowIndex) => ({
          deleteDimension: {
            range: { sheetId, dimension: 'ROWS', startIndex: rowIndex - 1, endIndex: rowIndex },
          },
        })),
      },
    });
  }

  const rows = report.tasks.map((t) => [
    report.date,
    t.client,
    t.project,
    (Array.isArray(t.taskDetails) ? t.taskDetails : [String(t.taskDetails)]).join("\n"),
    t.priority,
    t.estimatedTime,
    t.timeSpent,
    t.output,
    t.status,
    t.blocker ?? '',
  ]);

  if (rows.length === 0) return { appended: 0 };

  // Re-read column A after deletions to find the true next empty row
  const colAAfter = await sheets.spreadsheets.values.get({
    spreadsheetId: config.sheetId,
    range: `'${config.employeeTab}'!A:A`,
  });
  const nextRow = (colAAfter.data.values ?? []).length + 1;

  // Write directly to the next empty row — avoids offset issues from messy existing data
  await sheets.spreadsheets.values.update({
    spreadsheetId: config.sheetId,
    range: `'${config.employeeTab}'!A${nextRow}`,
    valueInputOption: "RAW",
    requestBody: { values: rows },
  });

  return { appended: rows.length };
}

/** Read all rows of an employee tab for preview purposes. */
export async function readEmployeeTab(config: SheetsConfig): Promise<string[][]> {
  const auth = getJwt(config);
  const sheets = google.sheets({ version: "v4", auth });
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: config.sheetId,
    range: `'${config.employeeTab}'!A:J`,
  });
  return res.data.values ?? [];
}
