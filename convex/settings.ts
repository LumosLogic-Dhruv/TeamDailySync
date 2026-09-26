import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Settings — centralized integration management.
 *
 * Each settings kind is a singleton document. Admins update values from the
 * Settings page; the API server reads secrets server-side only. Queries that
 * expose settings to the browser must only return redacted shapes (booleans /
 * masked values), never raw keys.
 */
const ORG_SINGLETON = "singleton" as const;

/* ------------------------------- queries -------------------------------- */

export const getOrganization = query({
  handler: async (ctx) => {
    return (
      (await ctx.db
        .query("organizationSettings")
        .withIndex("by_kind", (q) => q.eq("kind", ORG_SINGLETON))
        .unique()) ?? null
    );
  },
});

export const getAi = query({
  handler: async (ctx) => {
    return (
      (await ctx.db
        .query("aiSettings")
        .withIndex("by_kind", (q) => q.eq("kind", ORG_SINGLETON))
        .unique()) ?? null
    );
  },
});

export const getSlack = query({
  handler: async (ctx) => {
    return (
      (await ctx.db
        .query("slackSettings")
        .withIndex("by_kind", (q) => q.eq("kind", ORG_SINGLETON))
        .unique()) ?? null
    );
  },
});

export const getGoogle = query({
  handler: async (ctx) => {
    return (
      (await ctx.db
        .query("googleSettings")
        .withIndex("by_kind", (q) => q.eq("kind", ORG_SINGLETON))
        .unique()) ?? null
    );
  },
});

/* ------------------------------ mutations ------------------------------- */

export const setOrganization = mutation({
  args: {
    sheetId: v.optional(v.string()),
    timezone: v.optional(v.string()),
    updatedBy: v.optional(v.string()),
  },
  handler: async (ctx, patch) => {
    const existing = await ctx.db
      .query("organizationSettings")
      .withIndex("by_kind", (q) => q.eq("kind", ORG_SINGLETON))
      .unique();
    const fields = { ...patch, updatedAt: Date.now() };
    if (existing) {
      ctx.db.patch(existing._id, fields);
      return existing._id;
    }
    return ctx.db.insert("organizationSettings", {
      kind: ORG_SINGLETON,
      createdBy: patch.updatedBy,
      ...fields,
    });
  },
});

export const setAi = mutation({
  args: {
    geminiApiKey: v.optional(v.string()),
    groqApiKey: v.optional(v.string()),
    activeProvider: v.optional(v.union(v.literal("gemini"), v.literal("groq"))),
    updatedBy: v.optional(v.string()),
  },
  handler: async (ctx, patch) => {
    const existing = await ctx.db
      .query("aiSettings")
      .withIndex("by_kind", (q) => q.eq("kind", ORG_SINGLETON))
      .unique();
    // Empty strings mean "clear the value"; undefined means "leave as-is".
    const fields = Object.fromEntries(
      Object.entries(patch).filter(([, v]) => v !== undefined),
    );
    if (existing) {
      ctx.db.patch(existing._id, { ...fields, updatedAt: Date.now() });
      return existing._id;
    }
    return ctx.db.insert("aiSettings", { kind: ORG_SINGLETON, ...fields, updatedAt: Date.now() });
  },
});

export const setSlack = mutation({
  args: {
    webhookUrl: v.optional(v.string()),
    channel: v.optional(v.string()),
    updatedBy: v.optional(v.string()),
  },
  handler: async (ctx, patch) => {
    const existing = await ctx.db
      .query("slackSettings")
      .withIndex("by_kind", (q) => q.eq("kind", ORG_SINGLETON))
      .unique();
    const fields = Object.fromEntries(
      Object.entries(patch).filter(([, v]) => v !== undefined),
    );
    if (existing) {
      ctx.db.patch(existing._id, { ...fields, updatedAt: Date.now() });
      return existing._id;
    }
    return ctx.db.insert("slackSettings", { kind: ORG_SINGLETON, ...fields, updatedAt: Date.now() });
  },
});

export const setGoogle = mutation({
  args: {
    serviceAccountEmail: v.optional(v.string()),
    privateKey: v.optional(v.string()),
    updatedBy: v.optional(v.string()),
  },
  handler: async (ctx, patch) => {
    const existing = await ctx.db
      .query("googleSettings")
      .withIndex("by_kind", (q) => q.eq("kind", ORG_SINGLETON))
      .unique();
    // Normalize PEM newlines coming from browser textareas.
    const fields = Object.fromEntries(
      Object.entries(patch)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => (k === "privateKey" && typeof v === "string" ? [k, v.replace(/\\n/g, "\n")] : [k, v])),
    );
    if (existing) {
      ctx.db.patch(existing._id, { ...fields, updatedAt: Date.now() });
      return existing._id;
    }
    return ctx.db.insert("googleSettings", { kind: ORG_SINGLETON, ...fields, updatedAt: Date.now() });
  },
});

/** Redacted view for the Settings page UI — no secret material, ever. */
export const getRedacted = query({
  handler: async (ctx) => {
    const [org, ai, slack, google] = await Promise.all([
      ctx.db.query("organizationSettings").withIndex("by_kind", (q) => q.eq("kind", ORG_SINGLETON)).unique(),
      ctx.db.query("aiSettings").withIndex("by_kind", (q) => q.eq("kind", ORG_SINGLETON)).unique(),
      ctx.db.query("slackSettings").withIndex("by_kind", (q) => q.eq("kind", ORG_SINGLETON)).unique(),
      ctx.db.query("googleSettings").withIndex("by_kind", (q) => q.eq("kind", ORG_SINGLETON)).unique(),
    ]);
    return {
      hasGeminiKey: Boolean(ai?.geminiApiKey),
      hasGroqKey: Boolean(ai?.groqApiKey),
      hasSheetId: Boolean(org?.sheetId),
      hasSlackWebhook: Boolean(slack?.webhookUrl),
      hasServiceAccount: Boolean(google?.serviceAccountEmail && google?.privateKey),
      sheetId: org?.sheetId ?? undefined,
      timezone: org?.timezone ?? undefined,
    };
  },
});
