import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Drafts — per-user in-progress work entries.
 * Replaces the previous localStorage persistence so drafts survive across
 * devices and are visible to the whole team stack. The Daily Entry page keeps
 * its exact UX; autosave simply targets Convex through the API server.
 */

/** Replace the user's draft content wholesale (autosave model used by the UI). */
export const save = mutation({
  args: { userId: v.id("users"), content: v.string() },
  handler: async (ctx, { userId, content }) => {
    const existing = await ctx.db
      .query("drafts")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    const now = Date.now();
    if (existing) {
      ctx.db.patch(existing._id, { content, updatedAt: now });
      return existing._id;
    }
    return ctx.db.insert("drafts", { userId, content, updatedAt: now });
  },
});

/** Append a quick-add line to the user's draft (keeps one document per user). */
export const appendEntry = mutation({
  args: { userId: v.id("users"), entry: v.string() },
  handler: async (ctx, { userId, entry }) => {
    const existing = await ctx.db
      .query("drafts")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    const now = Date.now();
    const line = entry.trim();
    if (!line) return existing?._id;
    if (existing) {
      const next = existing.content ? `${existing.content}\n${line}` : line;
      ctx.db.patch(existing._id, { content: next, updatedAt: now });
      return existing._id;
    }
    return ctx.db.insert("drafts", { userId, content: line, updatedAt: now });
  },
});

export const get = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    return (
      (await ctx.db
        .query("drafts")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .unique()) ?? null
    );
  },
});

export const remove = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const existing = await ctx.db
      .query("drafts")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (existing) ctx.db.delete(existing._id);
  },
});
