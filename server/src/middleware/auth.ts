/**
 * Auth middleware — architecture placeholder for Google Login.
 *
 * Today: the client sends the user's email with each request (internal tool,
 * same trust level as the previous implementation). The middleware resolves it
 * to a Convex user so routes always have a real user + sheet tab + role.
 *
 * Later: verify the Google ID token (or session cookie) in `resolveUser` and
 * ignore the email header entirely — route handlers stay unchanged.
 */
import type { NextFunction, Request, Response } from "express";
import { verifyGoogleUser } from "../services/userService.js";
import type { AuthUser } from "@tasksync/shared/types";

const EMAIL_HEADER = "x-tasksync-email";

export interface AuthedRequest extends Request {
  user?: AuthUser
}

export function requireUser(req: AuthedRequest, res: Response, next: NextFunction): void {
  const email = String(req.headers[EMAIL_HEADER] ?? "").toLowerCase().trim();
  if (!email) {
    res.status(401).json({ error: "Sign in required" });
    return;
  }
  verifyGoogleUser({ email })
    .then((user) => {
      if (!user) {
        res.status(403).json({
          error: "You are not on the team mapping. Ask an admin to add your email in Settings.",
        });
        return;
      }
      req.user = user;
      next();
    })
    .catch(next);
}

/** Attach user when the header exists, but never block the request. */
export function optionalUser(req: AuthedRequest, _res: Response, next: NextFunction): void {
  const email = String(req.headers[EMAIL_HEADER] ?? "").toLowerCase().trim();
  if (!email) {
    next();
    return;
  }
  verifyGoogleUser({ email })
    .then((user) => {
      req.user = user ?? undefined;
      next();
    })
    .catch(() => next());
}
