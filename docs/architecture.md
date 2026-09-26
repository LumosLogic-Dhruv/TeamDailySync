# TaskSync — Architecture

## Overview

```
┌──────────────────────────────────────────────────────────────────────────┐
│                            apps/web  (React SPA)                         │
│   SAME UI: pages, shadcn components, Tailwind, Framer Motion — untouched │
│   lib/api.ts  →  REST calls (same paths as before)                       │
└───────────────────────────────┬──────────────────────────────────────────┘
                                │ /api/*  (Vite proxy in dev)
┌───────────────────────────────▼──────────────────────────────────────────┐
│                       server/  (the ONE Express backend)                  │
│  routes/        auth · team · settings · ai · sheets · slack · drafts     │
│  middleware/    auth (user resolution) · errors                           │
│  services/      settingsService · userService · draftService ·            │
│                 reportService          (domain logic, Convex-backed)      │
│  integrations/  gemini/ · groq/ · slack/ · sheets/  (pure I/O adapters)   │
│  lib/convex.ts  single ConvexHttpClient (anyApi) — the DB access layer    │
└──────────┬───────────────────────────────────────────────┬───────────────┘
           │ HTTPS                                         │
┌──────────▼──────────────────────────────┐   ┌───────────▼───────────────┐
│        Convex  (primary database)       │   │   Third-party delivery     │
│  users · organizationSettings ·         │   │   targets (stateless):     │
│  aiSettings · slackSettings ·           │   │   • Google Sheets (EOD     │
│  googleSettings · drafts · reports ·    │   │     rows per employee tab) │
│  teamMembers                            │   │   • Slack incoming webhook │
└─────────────────────────────────────────┘   │   • Gemini → Groq AI       │
                                              └───────────────────────────┘
```

## Request flow (unchanged UX, new plumbing)

1. **Login** — `POST /api/auth/verify { email }` → server upserts/reads the user
   in Convex (`users:resolveByGoogleEmail`), verifying the email against
   `teamMembers`. Response `{ email, name, tabName, role }` — same shape as
   before plus `role`.
2. **Daily Entry** — quick-adds and autosave go to `POST/PUT /api/drafts` →
   persisted per user in Convex (localStorage remains only as an instant cache).
3. **Generate** — `POST /api/ai/process` → server reads Gemini/Groq keys from
   Convex `aiSettings`, calls Gemini (Groq fallback), returns the structured
   report, and stores it in Convex `reports` (audit trail).
4. **Ship** — `POST /api/sheets/append` uses the service-account creds from
   Convex `googleSettings`; `POST /api/slack/send` uses `slackSettings`.

## Folder structure

```
tasksync/
├── apps/
│   └── web/                  # React SPA (previous client/, UI untouched)
│       └── src/
│           ├── components/   # ui/ (shadcn) + layout/
│           ├── pages/        # login, dashboard, daily-entry, generated-report,
│           │                 # sheet-preview, settings
│           ├── lib/          # api client, auth ctx, theme ctx, storage adapter
│           └── hooks/
├── convex/                   # PRIMARY DATABASE (schema + functions)
│   ├── schema.ts             # tables + indexes
│   ├── users.ts              # login resolution: email → name/tab/role
│   ├── settings.ts           # org/AI/Slack/Google singletons + redacted query
│   ├── drafts.ts             # per-user drafts (replaces localStorage)
│   ├── reports.ts            # generated report history
│   └── team.ts               # team roster (email → sheet tab)
├── server/                   # the ONE backend
│   └── src/
│       ├── index.ts          # Express app wiring
│       ├── routes/           # HTTP surface (same /api paths as before)
│       ├── services/         # domain logic; reads/writes Convex
│       ├── integrations/     # gemini/ · groq/ · slack/ · sheets/ adapters
│       ├── middleware/       # auth (user resolution), errors
│       └── lib/convex.ts     # ConvexHttpClient data layer
├── shared/                   # isomorphic code (web + server + convex-safe)
│   ├── types/                # GeneratedReport, WorkEntry, RedactedSettings, ...
│   ├── constants/            # SHEET_COLUMNS, prompts, validation lists
│   └── utils/                # AI JSON parser
└── docs/                     # this documentation
```

## Data ownership

| Concern              | Where it lives now                          | Before                        |
| -------------------- | ------------------------------------------- | ----------------------------- |
| Users & roles        | Convex `users`                              | settings.json userMapping     |
| Sheet ID, timezone   | Convex `organizationSettings`               | settings.json                 |
| AI keys              | Convex `aiSettings` (server-only reads)     | settings.json / localStorage  |
| Slack webhook        | Convex `slackSettings`                      | settings.json                 |
| Google SA creds      | Convex `googleSettings`                     | settings.json                 |
| Drafts / quick-adds  | Convex `drafts` (per user)                  | localStorage                  |
| Report history       | Convex `reports`                            | nowhere (ephemeral)           |
| Team roster          | Convex `teamMembers`                        | settings.json                 |
| EOD rows             | Google Sheets (delivery target, unchanged)  | Google Sheets                 |

## Secrets policy

- Browser receives only booleans (`hasGeminiKey`, …) — identical to the old
  `redactSettings` contract.
- Raw values are read exclusively inside `server/src/services` at request time.
- No key ever appears in client bundles; `localStorage` no longer stores keys.

## Google Login readiness

`server/src/middleware/auth.ts` resolves `x-tasksync-email` → Convex user today.
When OAuth lands:

1. Add the OAuth callback route; verify the Google ID token server-side.
2. Call the same `users:resolveByGoogleEmail` with the verified profile.
3. Replace the email-header middleware with session/token auth — **route
   handlers and UI stay unchanged** because they already consume
   `{ email, name, tabName, role }`.

Email → sheet tab / role / Slack identity mapping is data, not code: rows in
`teamMembers` (+ optional `users.slackMemberId` later).
