# Migration Plan — legacy layout → TaskSync monorepo

## Phase 1 — Structure (DONE in this refactor)

### Deleted
| Path                             | Why                                            |
| -------------------------------- | ---------------------------------------------- |
| `client/dist-server/`            | duplicate compiled backend                     |
| `client/dist/`                   | stale build artifacts                          |
| `client/data/` (settings.json)   | file-based settings — replaced by Convex       |
| `client/server/`                 | duplicate backend (merged into `server/`)      |
| `client/tsconfig.server.json`    | no dual backend config needed                  |
| `client/package-lock.json`       | workspace root lockfile is authoritative       |
| root `server/` (old Express v2)  | second duplicate backend (routes/services merged) |
| `apps/web/.oxlintrc.json`        | lint config follows app                        |

### Moved / merged
| From                        | To                                   | Notes                                  |
| --------------------------- | ------------------------------------ | -------------------------------------- |
| `client/` (src, public, configs) | `apps/web/`                     | UI untouched — pure move               |
| `client/server/shared/types.ts` + `client/src/lib/types.ts` | `shared/types/` | single source of truth      |
| `client/server/ai.ts`       | `server/src/integrations/gemini/` + `groq/` | split by provider           |
| `client/server/prompts.ts`  | `shared/constants/` + `shared/utils/ai-parse.ts` | prompts are isomorphic |
| `client/server/google-sheets.ts` | `server/src/integrations/sheets/` |                              |
| `client/server/slack.ts`    | `server/src/integrations/slack/`     |                                        |
| `client/server/settings-store.ts` | DELETED (logic in `convex/settings.ts` + `server/src/services/settingsService.ts`) | |
| `server/src/services/*` (old) | superseded by `services/` + `integrations/` | old configService/sheetsService mock-file logic intentionally dropped |
| `client/src/lib/storage.ts` | rewritten as cache + Convex sync adapter | same synchronous UX          |

## Phase 2 — Convex provisioning (operational, run once)

```bash
npx convex dev          # creates the project, pushes convex/, writes .env CONVEX_URL
```

## Phase 3 — Data migration (one-time script)

1. **Team roster** — seed `teamMembers` from the old mapping (defaults preserved
   in the old settings.json / README). Suggested seed:

   ```ts
   // scripts/seed.ts (run with `npx convex run` or a Node script via ConvexHttpClient)
   // convex/team:replaceAll with members:
   [
     { email: "dhruvshere.lumoslogic@gmail.com", sheetTab: "Dhruv" },
     { email: "priyanshu@lumoslogic.com",        sheetTab: "Priyanshu" },
     { email: "hetanshi@lumoslogic.com",         sheetTab: "Hetanshi" },
     { email: "avan@lumoslogic.com",             sheetTab: "Avan" },
     { email: "praizy@lumoslogic.com",           sheetTab: "Praizy" },
     { email: "riken@lumoslogic.com",            sheetTab: "Riken" },
   ]
   ```

2. **Integrations** — re-enter the admin secrets once in Settings (they go to
   Convex now), or read the old `client/data/settings.json` locally and push
   via `settings:setAi`, `settings:setSlack`, `settings:setGoogle`,
   `settings:setOrganization`.
3. **Users** — auto-created on first login by `users:resolveByGoogleEmail`;
   no bulk import required.

## Phase 4 — Cutover

1. `npm install` at repo root (workspaces).
2. `npm run convex:dev` (terminal 1) — pushes schema/functions.
3. `npm run dev` (terminal 2) — API on :8787 + web on :5173.
4. Sign in with a roster email → Settings → verify integrations → generate an
   EOD report end-to-end.
5. Delete the legacy folders when confident (already done in Phase 1 here).

## Rollback

The old layout is self-contained; any pre-refactor copy of `client/` +
`server/` still runs. No data was lost except `data/settings.json` secrets,
which must simply be re-entered in Settings (they should never have been in a
file in the first place — that was the point of this migration).
