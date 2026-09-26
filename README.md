# TaskSync (AI Daily Sync)

Automate end-of-day (EOD) reporting: log work during the day, let AI structure
it, then push it to your Google Sheet tab and Slack with one click.

**Stack:** React 19 + TypeScript + Vite + Tailwind + shadcn-style UI +
Framer Motion on the front; a single Node/Express API; **Convex as the primary
database**; Gemini (primary) with Groq (fallback) for AI; Google Sheets as the
delivery target for EOD rows; Slack Incoming Webhook for delivery.

> 📐 **Architecture docs:** [docs/architecture.md](docs/architecture.md) ·
> [docs/convex-schema.md](docs/convex-schema.md) ·
> [docs/migration-plan.md](docs/migration-plan.md)

## Quick start

```bash
npm install                 # workspaces: apps/web, server, shared
npx convex dev              # 1st time: provision Convex, push schema, sets CONVEX_URL
npm run dev                 # API on :8787 + Vite on :5173 (proxy: /api -> :8787)
```

Then open http://localhost:5173, sign in with a team-roster email, and configure
keys in **Settings** (stored in Convex — no more settings.json).

### Production

```bash
npm run build               # typechecks + builds web
npm start                   # serves the built SPA + API on one port (default 8787)
```

## Setup walkthrough (first run)

1. **Sign in** — your email must exist in the team roster
   (Settings → User Mapping, persisted in Convex `teamMembers`).
2. **AI keys** — Settings → AI Providers
   (Gemini: https://aistudio.google.com/apikey · Groq: https://console.groq.com/keys)
3. **Google Sheet** — Settings → Google Sheet: Sheet ID + service-account
   email + private key. Share the sheet with the service account as Editor.
4. **Slack** — Settings → Slack: Incoming Webhook URL.

## How it works

```
Daily Entry (quick adds + freeform) ──▶ POST /api/ai/process ──▶ Gemini (Groq fallback)
                                                        │ report stored in Convex
                                                        ▼
                                 Generated Report page (editable + Slack preview)
                                         │                       │
                          POST /api/sheets/append     POST /api/slack/send
                                         ▼                       ▼
                                  Google Sheet tab          Slack channel
```

- **Convex is the source of truth** for users, settings, integrations, drafts
  and report history. **Google Sheets** remains the EOD delivery target.
- **Drafts** autosave to Convex per user — they follow you across devices.
  localStorage is only an instant cache.
- **Secrets** live in Convex and are read only by the API server; the browser
  only ever sees `hasGeminiKey`-style booleans.

## API reference

| Method | Path                    | Purpose                                        |
| ------ | ----------------------- | ---------------------------------------------- |
| POST   | `/api/auth/verify`      | Verify email against roster → `{ email, name, tabName, role }` |
| GET    | `/api/team`             | Team roster (`{ mapping }`)                    |
| GET    | `/api/settings`         | Redacted settings                              |
| POST   | `/api/settings`         | Save settings (keys, sheet, webhook, mapping)  |
| POST   | `/api/ai/process`       | Raw entries → structured report (+ stored)     |
| GET    | `/api/sheets/preview`   | Read rows from a tab (`?tab=`)                 |
| POST   | `/api/sheets/append`    | Append report rows to a tab                    |
| POST   | `/api/sheets/ensure-tab`| Create tab with headers if missing             |
| POST   | `/api/slack/preview`    | Build Block Kit message                        |
| POST   | `/api/slack/send`       | Send to Slack webhook (accepts edited `text`)  |
| GET/PUT| `/api/drafts`           | Per-user draft (Convex-backed)                 |
| POST   | `/api/drafts/entries`   | Append a quick-add line                        |
| GET    | `/api/health`           | Health check                                   |

## Scripts

| Script               | What it does                              |
| -------------------- | ----------------------------------------- |
| `npm run dev`        | API + web in watch mode                   |
| `npm run convex:dev` | Push Convex schema/functions (dev)        |
| `npm run build`      | Build web + typecheck server              |
| `npm start`          | Run the production API + static SPA       |
| `npm run typecheck`  | Typecheck web + server                    |

## Notes

- Auth is email-roster based for this internal tool; the middleware boundary
  (`server/src/middleware/auth.ts`) is the single place to drop in real Google
  OAuth — see docs/architecture.md.
- EOD rows remain in Google Sheets by design; everything else is in Convex.
