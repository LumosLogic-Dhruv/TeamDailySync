/**
 * Admin middleware — server-side gate for admin-only routes (/api/settings).
 *
 * The client hides the Settings page for non-admins, but the API must enforce
 * it too. Today the trust anchor is the signed-in email header (internal tool);
 * when real Google ID-token verification lands in requireUser, this inherits
 * it automatically.
 */
import type { NextFunction, Response } from "express";
import { isAdminEmail } from "@tasksync/shared/constants";
import type { AuthedRequest } from "./auth.js";

/** Reject the request unless the resolved user is on the admin allowlist. */
export function requireAdmin(
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
): void {
  const email = req.user?.email ?? req.headers["x-tasksync-email"];
  if (!isAdminEmail(typeof email === "string" ? email : undefined)) {
    res.status(403).json({ error: "Admin access required" });
    return;
  }
  next();
}
