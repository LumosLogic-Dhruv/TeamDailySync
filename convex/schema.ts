import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * TaskSync — Convex schema.
 *
 * Convex is the primary application database. Google Sheets remains the
 * *delivery target* for EOD rows (business requirement), but all application
 * state (users, settings, drafts, reports, team mapping) lives here.
 *
 * Design notes:
 * - Settings live in a single document (kind: "singleton") per settings kind.
 * - API keys are stored in `aiSettings` / `slackSettings` and are NEVER returned
 *   to the browser — queries only expose `has*` booleans / masked previews.
 * - Every table indexes on the fields used by its queries.
 */
export default defineSchema({
  /**
   * Application users (mirrors Google-login emails).
   * `sheetTab` is the employee's Google Sheet tab; auto-mapped on login.
   */
  users: defineTable({
    email: v.string(),
    name: v.string(),
    role: v.union(v.literal("admin"), v.literal("member")),
    sheetTab: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    lastLoginAt: v.optional(v.number()),
  })
    .index("by_email", ["email"])
    .index("by_role", ["role"]),

  /** Organization-level, non-secret settings (sheetId, timezone). */
  organizationSettings: defineTable({
    kind: v.literal("singleton"),
    sheetId: v.optional(v.string()),
    timezone: v.optional(v.string()),
    createdBy: v.optional(v.string()),
    updatedBy: v.optional(v.string()),
    updatedAt: v.optional(v.number()),
  }).index("by_kind", ["kind"]),

  /** AI provider configuration. Secrets never leave the server side. */
  aiSettings: defineTable({
    kind: v.literal("singleton"),
    geminiApiKey: v.optional(v.string()),
    groqApiKey: v.optional(v.string()),
    activeProvider: v.optional(v.union(v.literal("gemini"), v.literal("groq"))),
    updatedBy: v.optional(v.string()),
    updatedAt: v.optional(v.number()),
  }).index("by_kind", ["kind"]),

  /** Slack incoming-webhook configuration. */
  slackSettings: defineTable({
    kind: v.literal("singleton"),
    webhookUrl: v.optional(v.string()),
    channel: v.optional(v.string()),
    updatedBy: v.optional(v.string()),
    updatedAt: v.optional(v.number()),
  }).index("by_kind", ["kind"]),

  /** Google service-account credentials for Sheets writes. */
  googleSettings: defineTable({
    kind: v.literal("singleton"),
    serviceAccountEmail: v.optional(v.string()),
    privateKey: v.optional(v.string()),
    updatedBy: v.optional(v.string()),
    updatedAt: v.optional(v.number()),
  }).index("by_kind", ["kind"]),

  /** Per-user in-progress work entries (drafts) — replaces localStorage. */
  drafts: defineTable({
    userId: v.id("users"),
    content: v.string(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_updated", ["userId", "updatedAt"]),

  /** Generated AI reports (audit trail of everything produced). */
  reports: defineTable({
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
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_date", ["userId", "date"]),

  /** Team roster: email → sheet tab (+ Slack display name + role). */
  teamMembers: defineTable({
    name: v.string(),
    email: v.string(),
    sheetTab: v.string(),
    role: v.optional(v.union(v.literal("admin"), v.literal("member"))),
  })
    .index("by_email", ["email"])
    .index("by_sheet_tab", ["sheetTab"]),
});
