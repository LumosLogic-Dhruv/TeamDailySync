import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Users — resolution of a login email to sheet tab / role / name.
 *
 * Pre-Google-OAuth the web app "signs in" by email; the API server verifies the
 * email exists in `teamMembers` (the roster admins manage in Settings) and
 * upserts a `users` document. Once real Google Login is wired in, the same
 * `resolveByGoogleEmail` function is called from the OAuth callback — the UI
 * flow does not change.
 */
export const resolveByGoogleEmail = mutation({
  args: {
    email: v.string(),
    name: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
  },
  handler: async (ctx, { email, name, avatarUrl }) => {
    const normalized = email.toLowerCase().trim();

    const member = await ctx.db
      .query("teamMembers")
      .withIndex("by_email", (q) => q.eq("email", normalized))
      .unique();
    if (!member) return null; // not on the roster → login rejected upstream

    const fallbackName = name?.trim() || member.name;
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", normalized))
      .unique();

    const now = Date.now();
    const fields = {
      email: normalized,
      name: fallbackName,
      role: member.role ?? ("member" as const),
      sheetTab: member.sheetTab,
      avatarUrl: avatarUrl ?? existing?.avatarUrl,
      lastLoginAt: now,
    };

    if (existing) {
      await ctx.db.patch(existing._id, fields);
      return { ...existing, ...fields };
    }
    const id = await ctx.db.insert("users", fields);
    return { ...fields, _id: id };
  },
});

export const getByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    return ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email.toLowerCase().trim()))
      .unique();
  },
});

export const list = query({
  handler: async (ctx) => ctx.db.query("users").collect(),
});
