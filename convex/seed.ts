import { internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { isAdminEmail } from "@tasksync/shared/constants";

/**
 * One-time seed of the default team roster (previously hardcoded in
 * settings-store.ts). Run with:
 *   npx convex run seed:seedTeamRoster
 * Safe to re-run — upserts by email.
 */
const ROSTER = [
  { email: "dhruvshere.lumoslogic@gmail.com", name: "Dhruv", sheetTab: "Dhruv", role: "admin" as const },
  { email: "priyanshu@lumoslogic.com", name: "Priyanshu", sheetTab: "Priyanshu", role: "member" as const },
  { email: "hetanshi@lumoslogic.com", name: "Hetanshi", sheetTab: "Hetanshi", role: "member" as const },
  { email: "avan@lumoslogic.com", name: "Avan", sheetTab: "Avan", role: "member" as const },
  { email: "praizy@lumoslogic.com", name: "Praizy", sheetTab: "Praizy", role: "member" as const },
  { email: "riken@lumoslogic.com", name: "Riken", sheetTab: "Riken", role: "member" as const },
];

export const seedTeamRoster = internalMutation({
  args: {},
  handler: async (ctx) => {
    let inserted = 0;
    let existing = 0;
    let promoted = 0;
    for (const m of ROSTER) {
      const found = await ctx.db
        .query("teamMembers")
        .withIndex("by_email", (q) => q.eq("email", m.email))
        .unique();
      if (found) {
        // Keep role in sync with the allowlist (e.g. member → admin promotions).
        if (isAdminEmail(m.email) && found.role !== "admin") {
          await ctx.db.patch(found._id, { role: "admin" });
          promoted++;
        }
        existing++;
        continue;
      }
      await ctx.db.insert("teamMembers", m);
      inserted++;
    }
    return { inserted, existing, promoted };
  },
});
