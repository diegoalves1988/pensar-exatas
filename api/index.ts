/**
 * Vercel Serverless Function Entry Point
 * NOTE: do NOT import anything from server/_core/vite.ts — it pulls in vite (devDep).
 */

import express from "express";
import postgres from "postgres";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "../server/_core/oauth";
import { registerAdminRoutes } from "../server/_core/admin";
import { appRouter } from "../server/routers";
import { createContext } from "../server/_core/context";

const app = express();

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Auth routes (register, login, OAuth callback)
registerOAuthRoutes(app);

// Admin + misc routes (/api/me, /api/subjects, /api/admin/*)
registerAdminRoutes(app);

// tRPC
app.use(
  "/api/trpc",
  createExpressMiddleware({ router: appRouter, createContext })
);

// Health check
app.get("/api/health", (_req: any, res: any) => {
  res.json({ ok: true });
});

// Public questions listing
app.get("/api/questions", async (_req: any, res: any) => {
  const send = (code: number, body: any) => res.status(code).json(body);
  const baseUrl = process.env.DATABASE_URL || "";
  if (!baseUrl) return send(200, { items: [] });
  const url = baseUrl.includes("sslmode=")
    ? baseUrl
    : baseUrl.includes("?")
      ? `${baseUrl}&sslmode=require`
      : `${baseUrl}?sslmode=require`;

  let sql: ReturnType<typeof postgres> | null = null;
  try {
    sql = postgres(url, { prepare: false });
    const rows = await sql`
      select id, "subjectId", title, statement, solution, difficulty, year,
             "sourceUrl", "imageUrl", choices, "correctChoice"
      from questions
      order by id desc
      limit 1000
    `;
    return send(200, { items: rows });
  } catch (err) {
    console.error("[Serverless] GET /api/questions failed", err);
    return send(500, { items: [], error: String(err) });
  } finally {
    try { if (sql) await (sql as any).end({ timeout: 1 }); } catch {}
  }
});

// Export for Vercel
export default app;

