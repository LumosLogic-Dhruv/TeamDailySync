import express from "express";
import cors from "cors";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

import { authRouter } from "./routes/auth.js";
import { teamRouter } from "./routes/team.js";
import { settingsRouter } from "./routes/settings.js";
import { aiRouter } from "./routes/ai.js";
import { sheetsRouter } from "./routes/sheets.js";
import { slackRouter } from "./routes/slack.js";
import { draftsRouter } from "./routes/drafts.js";
import { optionalUser } from "./middleware/auth.js";
import { errorHandler, notFoundHandler } from "./middleware/errors.js";

// Load .env from the project root (this file lives in server/src/, so the
// root is two levels up) with a fallback to the default lookup.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config();

const app = express();

app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://teamdailysync.web.app',
    'https://teamdailysync.firebaseapp.com',
  ],
  credentials: true,
}));
app.use(express.json({ limit: "2mb" }));

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "tasksync-api", timestamp: new Date().toISOString() });
});

// API routes (identical paths to the previous implementation)
app.use("/api/auth", authRouter);
app.use("/api/team", teamRouter);
app.use("/api/settings", settingsRouter);
app.use("/api/ai", aiRouter);
app.use("/api/sheets", sheetsRouter);
app.use("/api/slack", slackRouter);
app.use("/api/drafts", optionalUser, draftsRouter);

// 404 for unknown API paths, then static SPA serving for production builds
app.use("/api", notFoundHandler);

const distCandidates = [
  path.resolve(__dirname, "../web-dist"), // repo-root deployment: server/dist/../web-dist
  path.resolve(__dirname, "../../apps/web/dist"), // monorepo dev/preview layout
  path.resolve(__dirname, "../../../apps/web/dist"), // compiled dist/server/ layout
];
const distDir = distCandidates.find((d) => fs.existsSync(path.join(d, "index.html")));
if (distDir) {
  app.use(express.static(distDir));
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(path.join(distDir, "index.html"));
  });
}

app.use(errorHandler);

const PORT = Number(process.env.PORT ?? 8787);
app.listen(PORT, () => {
  console.log(`[tasksync] API server listening on http://localhost:${PORT}`);
});
