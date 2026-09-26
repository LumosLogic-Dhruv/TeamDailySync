import { Router } from "express";
import { getRedactedSettings, saveSettings } from "../services/settingsService.js";
import { asyncHandler } from "../middleware/errors.js";
import type { AuthedRequest } from "../middleware/auth.js";
import type { SaveSettingsPayload } from "@tasksync/shared/types";

export const settingsRouter = Router();

/** GET /api/settings — redacted view (booleans + sheetId), secrets never leave the server. */
settingsRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    res.json(await getRedactedSettings());
  }),
);

/** POST /api/settings — admin updates for keys, sheet, webhook and user mapping. */
settingsRouter.post(
  "/",
  asyncHandler(async (req: AuthedRequest, res) => {
    const saved = await saveSettings(
      (req.body ?? {}) as SaveSettingsPayload,
      req.user?.email,
    );
    res.json(saved);
  }),
);
