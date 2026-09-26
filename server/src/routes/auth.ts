import { Router } from "express";
import { verifyGoogleUser } from "../services/userService.js";
import { asyncHandler } from "../middleware/errors.js";

export const authRouter = Router();

/**
 * POST /api/auth/verify
 * Same request/response contract as before — the login page is unchanged.
 * With Google OAuth, this route will receive the verified profile instead.
 */
authRouter.post(
  "/verify",
  asyncHandler(async (req, res) => {
    const email = String(req.body?.email ?? "").toLowerCase().trim();
    if (!email) {
      res.status(400).json({ error: "Email is required" });
      return;
    }
    const user = await verifyGoogleUser({
      email,
      name: typeof req.body?.name === "string" ? req.body.name : undefined,
      avatarUrl: typeof req.body?.picture === "string" ? req.body.picture : undefined,
    });
    if (!user) {
      res.status(403).json({
        error: "You are not on the team mapping. Ask an admin to add your email in Settings.",
      });
      return;
    }
    res.json(user);
  }),
);
