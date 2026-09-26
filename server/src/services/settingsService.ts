/**
 * Settings service — centralized integration management backed by Convex.
 * Replaces the old file-based settings-store.ts / ConfigService.
 */
import { convexQuery, convexMutation } from "../lib/convex.js";
import type { RedactedSettings, SaveSettingsPayload, TeamMember } from "@tasksync/shared/types";

interface AiDoc {
  geminiApiKey?: string;
  groqApiKey?: string;
  activeProvider?: "gemini" | "groq";
}
interface SlackDoc {
  webhookUrl?: string;
  channel?: string;
}
interface GoogleDoc {
  serviceAccountEmail?: string;
  privateKey?: string;
}
interface OrgDoc {
  sheetId?: string;
  timezone?: string;
}

export interface FullSettings {
  ai: AiDoc | null
  slack: SlackDoc | null
  google: GoogleDoc | null
  org: OrgDoc | null
}

export async function getFullSettings(): Promise<FullSettings> {
  const [ai, slack, google, org] = await Promise.all([
    convexQuery("settings:getAi") as Promise<AiDoc | null>,
    convexQuery("settings:getSlack") as Promise<SlackDoc | null>,
    convexQuery("settings:getGoogle") as Promise<GoogleDoc | null>,
    convexQuery("settings:getOrganization") as Promise<OrgDoc | null>,
  ]);
  return { ai, slack, google, org };
}

/** Redacted view for the Settings page — identical shape to the old API. */
export async function getRedactedSettings(): Promise<RedactedSettings> {
  const { ai, slack, google, org } = await getFullSettings();
  return {
    hasGeminiKey: Boolean(ai?.geminiApiKey),
    hasGroqKey: Boolean(ai?.groqApiKey),
    hasSheetId: Boolean(org?.sheetId),
    hasSlackWebhook: Boolean(slack?.webhookUrl),
    hasServiceAccount: Boolean(google?.serviceAccountEmail && google?.privateKey),
    userMapping: await getTeamMapping(),
    sheetId: org?.sheetId,
  };
}

/** Secrets + config for server-side use only (AI calls, Sheets JWT, Slack). */
export async function getRuntimeSecrets(): Promise<{
  geminiApiKey?: string
  groqApiKey?: string
  slackWebhookUrl?: string
  sheetId?: string
  serviceAccountEmail?: string
  privateKey?: string
}> {
  const { ai, slack, google, org } = await getFullSettings();
  return {
    geminiApiKey: ai?.geminiApiKey,
    groqApiKey: ai?.groqApiKey,
    slackWebhookUrl: slack?.webhookUrl,
    sheetId: org?.sheetId,
    serviceAccountEmail: google?.serviceAccountEmail,
    privateKey: google?.privateKey,
  };
}

export async function getTeamMapping(): Promise<TeamMember[]> {
  const members = (await convexQuery("team:list")) as
    | { email: string; name: string; sheetTab: string; role?: string }[]
    | undefined;
  return (members ?? []).map((m) => ({
    email: m.email,
    tabName: m.sheetTab,
    role: (m.role as TeamMember["role"]) ?? "member",
  }));
}

/**
 * Apply a settings save from the admin UI onto the Convex singletons.
 * Semantics preserved from the old API: empty/undefined fields are ignored,
 * provided non-empty values overwrite.
 */
export async function saveSettings(
  body: SaveSettingsPayload,
  actorEmail?: string,
): Promise<RedactedSettings> {
  const jobs: Promise<unknown>[] = [];

  if (typeof body.geminiApiKey === "string" && body.geminiApiKey.trim()) {
    jobs.push(convexMutation("settings:setAi", { geminiApiKey: body.geminiApiKey.trim(), updatedBy: actorEmail }));
  }
  if (typeof body.groqApiKey === "string" && body.groqApiKey.trim()) {
    jobs.push(convexMutation("settings:setAi", { groqApiKey: body.groqApiKey.trim(), updatedBy: actorEmail }));
  }
  if (typeof body.sheetId === "string") {
    jobs.push(convexMutation("settings:setOrganization", { sheetId: body.sheetId.trim(), updatedBy: actorEmail }));
  }
  if (typeof body.timezone === "string") {
    jobs.push(convexMutation("settings:setOrganization", { timezone: body.timezone.trim(), updatedBy: actorEmail }));
  }
  if (typeof body.slackWebhookUrl === "string") {
    jobs.push(convexMutation("settings:setSlack", { webhookUrl: body.slackWebhookUrl.trim(), updatedBy: actorEmail }));
  }
  if (typeof body.googleServiceAccountEmail === "string") {
    jobs.push(
      convexMutation("settings:setGoogle", {
        serviceAccountEmail: body.googleServiceAccountEmail.trim(),
        updatedBy: actorEmail,
      }),
    );
  }
  if (typeof body.googlePrivateKey === "string" && body.googlePrivateKey.trim()) {
    jobs.push(
      convexMutation("settings:setGoogle", {
        privateKey: body.googlePrivateKey.trim(),
        updatedBy: actorEmail,
      }),
    );
  }
  if (Array.isArray(body.userMapping)) {
    jobs.push(
      convexMutation("team:replaceAll", {
        members: (body.userMapping as TeamMember[]).map((m) => ({
          email: String(m.email ?? "").toLowerCase().trim(),
          name: m.tabName,
          sheetTab: String(m.tabName ?? "").trim(),
          role: m.role ?? "member",
        })),
      }),
    );
  }

  await Promise.all(jobs);
  return getRedactedSettings();
}
