/**
 * Draft service — per-user work-entry drafts persisted in Convex
 * (replaces localStorage-based drafts; same autosave UX on the client).
 */
import { convexQuery, convexMutation } from "../lib/convex.js";

export interface DraftDoc {
  userId: string
  content: string
  updatedAt: number
}

export async function getDraft(userId: string): Promise<DraftDoc | null> {
  return (await convexQuery("drafts:get", { userId })) as DraftDoc | null;
}

export async function saveDraft(userId: string, content: string): Promise<void> {
  await convexMutation("drafts:save", { userId, content });
}

export async function appendDraftEntry(userId: string, entry: string): Promise<void> {
  await convexMutation("drafts:appendEntry", { userId, entry });
}

export async function clearDraft(userId: string): Promise<void> {
  await convexMutation("drafts:remove", { userId });
}
