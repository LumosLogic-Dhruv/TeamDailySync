# Convex Schema Design

Primary application database. Google Sheets remains the EOD *delivery target*;
everything else lives here.

## Tables

### `users`
One document per person who has signed in.

| Field         | Type                  | Notes                                       |
| ------------- | --------------------- | ------------------------------------------- |
| `email`       | `string`              | indexed (`by_email`) — login identity       |
| `name`        | `string`              | display name                                |
| `role`        | `"admin" \| "member"` | drives future admin gating                  |
| `sheetTab`    | `string?`             | employee's Google Sheet tab                 |
| `avatarUrl`   | `string?`             | from Google profile                         |
| `lastLoginAt` | `number?`             | set on every resolve                        |

Indexes: `by_email`, `by_role`.

### `organizationSettings` — singleton
| Field       | Type      | Notes                          |
| ----------- | --------- | ------------------------------ |
| `kind`      | `"singleton"` | indexed (`by_kind`)        |
| `sheetId`   | `string?` | target spreadsheet             |
| `timezone`  | `string?` | org timezone                   |
| `createdBy` / `updatedBy` / `updatedAt` | audit fields |

### `aiSettings` — singleton
| Field             | Type                        | Notes                    |
| ----------------- | --------------------------- | ------------------------ |
| `kind`            | `"singleton"`               |                          |
| `geminiApiKey`    | `string?`                   | secret — server-only     |
| `groqApiKey`      | `string?`                   | secret — server-only     |
| `activeProvider`  | `"gemini" \| "groq"?`       | default Gemini           |

### `slackSettings` — singleton
| Field        | Type      | Notes                              |
| ------------ | --------- | ---------------------------------- |
| `kind`       | `"singleton"` |                                |
| `webhookUrl` | `string?` | secret — server-only               |
| `channel`    | `string?` | display label                      |

### `googleSettings` — singleton
| Field                  | Type      | Notes                                |
| ---------------------- | --------- | ------------------------------------ |
| `kind`                 | `"singleton"` |                                  |
| `serviceAccountEmail`  | `string?` |                                      |
| `privateKey`           | `string?` | secret — server-only, PEM normalized |

### `drafts`
| Field       | Type     | Notes                                     |
| ----------- | -------- | ----------------------------------------- |
| `userId`    | `Id<"users">` | indexed (`by_user`, `by_user_updated`) |
| `content`   | `string` | freeform + quick-add lines                |
| `updatedAt` | `number` |                                           |

### `reports`
| Field                   | Type          | Notes                                |
| ----------------------- | ------------- | ------------------------------------ |
| `userId`                | `Id<"users">` | indexed (`by_user`, `by_user_date`)  |
| `rawInput`              | `string`      | original notes                       |
| `generatedSlackMessage` | `string?`     | AI slack summary                     |
| `generatedSheetRows`    | row objects[] | one entry per task                   |
| `provider`              | `string?`     | gemini / groq                        |
| `date` / `totalHours` / `createdAt`   | scalar  |                                |

### `teamMembers`
| Field      | Type                  | Notes                                   |
| ---------- | --------------------- | --------------------------------------- |
| `name`     | `string`              |                                         |
| `email`    | `string`              | indexed (`by_email`)                    |
| `sheetTab` | `string`              | indexed (`by_sheet_tab`)                |
| `role`     | `"admin" \| "member"?`|                                         |

## Design rules

1. **Singletons via `kind: "singleton"`** — one doc per settings kind; upserts
   are idempotent (`settings:set*` functions).
2. **Secrets never cross to the browser.** All client-facing queries return
   booleans (`settings:getRedacted`). Only server services read raw values.
3. **Email is the join key.** `users`, `teamMembers` (and later Slack member
   IDs) all resolve by normalized lowercase email.
4. **Sheets stay stateless.** Convex stores config + history; actual EOD rows
   are still written to the Google spreadsheet per business workflow.
