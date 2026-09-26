import { ConvexHttpClient } from "convex/browser";
import { anyApi } from "convex/server";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

/**
 * Convex data layer — the single access point to the application database.
 *
 * The API server talks to Convex over HTTPS using ConvexHttpClient with the
 * untyped `anyApi` object (no generated API needed from the server side).
 * All persistence (users, settings, drafts, reports, team) goes through here.
 */
// Load .env before reading CONVEX_URL (ES module imports hoist above index.ts's
// own dotenv call, so this module must be self-sufficient).
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
dotenv.config();

const CONVEX_URL =
  process.env.CONVEX_URL ??
  process.env.NEXT_PUBLIC_CONVEX_URL ??
  process.env.VITE_CONVEX_URL ??
  "";

if (!CONVEX_URL) {
  // Don't crash the process (Convex may not be provisioned in some envs yet);
  // services will surface a clear error if a route actually needs the DB.
  console.warn(
    "[tasksync] CONVEX_URL is not set — Convex-backed features will fail until it is configured.",
  );
}

const convex = new ConvexHttpClient(CONVEX_URL || "http://localhost:3000");

/** Loose-typed surface so we can call any deployed Convex function by name. */
interface LooseConvexClient {
  query: (ref: unknown, args?: unknown) => Promise<unknown>
  mutation: (ref: unknown, args?: unknown) => Promise<unknown>
}
const loose = convex as unknown as LooseConvexClient;

function ref(name: string): unknown {
  const [module, fnName] = name.split(":") as [string, string];
  const table = (anyApi as unknown as Record<string, Record<string, unknown>>)[module];
  if (!table || typeof table[fnName] === "undefined") {
    throw new Error(
      `Unknown Convex function "${name}". Is the deployment up to date (npx convex dev)?`,
    );
  }
  return table[fnName];
}

export async function convexQuery(
  name: string,
  args: Record<string, unknown> = {},
): Promise<unknown> {
  return loose.query(ref(name), args);
}

export async function convexMutation(
  name: string,
  args: Record<string, unknown> = {},
): Promise<unknown> {
  return loose.mutation(ref(name), args);
}
