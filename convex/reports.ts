import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Reports — audit trail of every AI-generated EOD report.
 * The structured tasks and the Slack message are stored at generation time,
 * so history survives browser changes and can power future dashboards.
 */
export const create = mutation({
  args: {
    userId: v.id("users"),
    rawInput: v.string(),
    generatedSlackMessage: v.optional(v.string()),
    generatedSheetRows: v.array(
      v.object({
        client: v.string(),
        project: v.string(),
        taskDetails: v.array(v.string()),
        priority: v.string(),
        estimatedTime: v.string(),
        timeSpent: v.string(),
        output: v.string(),
        status: v.string(),
      }),
    ),
    provider: v.optional(v.string()),
    date: v.string(),
    totalHours: v.number(),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("reports", { ...args, createdAt: Date.now() });
    return id;
  },
});

export const listForUser = query({
  args: { userId: v.id("users"), limit: v.optional(v.number()) },
  handler: async (ctx, { userId, limit }) => {
    const all = await ctx.db
      .query("reports")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(limit ?? 20);
    return all;
  },
});

export const latestForUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    return (
      (await ctx.db
        .query("reports")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .order("desc")
        .first()) ?? null
    );
  },
});
