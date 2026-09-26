import { Router } from "express";
import { appendDraftEntry, getDraft, saveDraft } from "../services/draftService.js";
import { findUserIdByEmail } from "../services/userService.js";
import type { AuthedRequest } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/errors.js";

export const draftsRouter = Router();

/** All draft routes require a resolved user. */
function requireEmail(req: AuthedRequest): string | null {
  return req.user?.email ?? null;
}

/** GET /api/drafts — the user's current draft. */
draftsRouter.get(
  "/",
  asyncHandler(async (req: AuthedRequest, res) => {
    const email = requireEmail(req);
    if (!email) {
      res.status(401).json({ error: "Sign in required" });
      return;
    }
    const userId = await findUserIdByEmail(email);
    if (!userId) {
      res.json({ content: "", updatedAt: null });
      return;
    }
    const draft = await getDraft(userId);
    res.json({ content: draft?.content ?? "", updatedAt: draft?.updatedAt ?? null });
  }),
);

/** PUT /api/drafts — autosave the freeform draft text. */
draftsRouter.put(
  "/",
  asyncHandler(async (req: AuthedRequest, res) => {
    const email = requireEmail(req);
    const content = typeof req.body?.content === "string" ? req.body.content : "";
    if (!email) {
      res.status(401).json({ error: "Sign in required" });
      return;
    }
    const userId = await findUserIdByEmail(email);
    if (!userId) {
      res.status(403).json({ error: "Unknown user" });
      return;
    }
    await saveDraft(userId, content);
    res.json({ ok: true });
  }),
);

/** POST /api/drafts/entries — append a quick-add line. */
draftsRouter.post(
  "/entries",
  asyncHandler(async (req: AuthedRequest, res) => {
    const email = requireEmail(req);
    const entry = typeof req.body?.entry === "string" ? req.body.entry : "";
    if (!email) {
      res.status(401).json({ error: "Sign in required" });
      return;
    }
    const userId = await findUserIdByEmail(email);
    if (!userId) {
      res.status(403).json({ error: "Unknown user" });
      return;
    }
    await appendDraftEntry(userId, entry);
    res.json({ ok: true });
  }),
);
