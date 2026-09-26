/**
 * User service — authentication boundary.
 *
 * Resolves a Google-login email to a full user (name, sheet tab, role) through
 * Convex. When real Google OAuth is added, the OAuth callback will call
 * `verifyGoogleUser` with the verified profile; nothing else changes.
 */
import { convexQuery, convexMutation } from "../lib/convex.js";
import type { AuthUser } from "@tasksync/shared/types";

export async function verifyGoogleUser(input: {
  email: string
  name?: string
  avatarUrl?: string
}): Promise<AuthUser | null> {
  const result = (await convexMutation("users:resolveByGoogleEmail", {
    email: input.email,
    name: input.name,
    avatarUrl: input.avatarUrl,
  })) as {
    email: string
    name: string
    role: "admin" | "member"
    sheetTab?: string
    avatarUrl?: string
  } | null;

  if (!result) return null; // email not on the team roster

  return {
    email: result.email,
    name: result.name,
    tabName: result.sheetTab ?? "",
    role: result.role,
    avatarUrl: result.avatarUrl,
  };
}

export async function findUserIdByEmail(email: string): Promise<string | null> {
  const user = (await convexQuery("users:getByEmail", { email })) as { _id: string } | null;
  return user?._id ?? null;
}
