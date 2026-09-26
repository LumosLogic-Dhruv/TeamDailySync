import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Team members — the roster that maps a Google account email to its sheet tab.
 * Backs the existing "User Mapping" section on the Settings page (same UX,
 * now persisted in Convex instead of settings.json).
 */
export const list = query({
  handler: async (ctx) => {
    return await ctx.db.query("teamMembers").collect();
  },
});

export const upsert = mutation({
  args: {
    email: v.string(),
    name: v.string(),
    sheetTab: v.string(),
    role: v.optional(v.union(v.literal("admin"), v.literal("member"))),
  },
  handler: async (ctx, { email, name, sheetTab, role }) => {
    const normalized = email.toLowerCase().trim();
    const existing = await ctx.db
      .query("teamMembers")
      .withIndex("by_email", (q) => q.eq("email", normalized))
      .unique();
    if (existing) {
      ctx.db.patch(existing._id, { name, sheetTab, role });
      return existing._id;
    }
    return ctx.db.insert("teamMembers", {
      email: normalized,
      name,
      sheetTab,
      role: role ?? "member",
    });
  },
});

/** Replace the whole mapping (mirrors the current "Save mapping" bulk action). */
export const replaceAll = mutation({
  args: {
    members: v.array(
      v.object({
        email: v.string(),
        name: v.optional(v.string()),
        tabName: v.optional(v.string()),
        sheetTab: v.optional(v.string()),
        role: v.optional(v.union(v.literal("admin"), v.literal("member"))),
      }),
    ),
  },
  handler: async (ctx, { members }) => {
    const existing = await ctx.db.query("teamMembers").collect();
    for (const doc of existing) await ctx.db.delete(doc._id);

    const ids = [];
    for (const m of members) {
      const email = m.email.toLowerCase().trim();
      const sheetTab = (m.sheetTab ?? m.tabName ?? "").trim();
      if (!email || !sheetTab) continue;
      const name = m.name?.trim() || sheetTab;
      const id = await ctx.db.insert("teamMembers", {
        email,
        name,
        sheetTab,
        role: m.role ?? "member",
      });
      ids.push(id);
    }
    return ids;
  },
});

export const removeByEmail = mutation({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const doc = await ctx.db
      .query("teamMembers")
      .withIndex("by_email", (q) => q.eq("email", email.toLowerCase().trim()))
      .unique();
    if (doc) ctx.db.delete(doc._id);
  },
});
