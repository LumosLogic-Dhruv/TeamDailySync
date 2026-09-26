import { Router } from "express";
import { getTeamMapping } from "../services/settingsService.js";
import { asyncHandler } from "../middleware/errors.js";

export const teamRouter = Router();

/** GET /api/team — same payload shape as before ({ mapping }). */
teamRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    res.json({ mapping: await getTeamMapping() });
  }),
);
