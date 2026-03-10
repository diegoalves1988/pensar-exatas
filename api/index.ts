/**
 * Vercel Serverless Function Entry Point
 * This file is required for Vercel to recognize the project as a Node.js application
 */

import express from "express";
import { createServer } from "http";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "../server/_core/oauth";
import { appRouter } from "../server/routers";
import { createContext } from "../server/_core/context";
import { serveStatic, setupVite } from "../server/_core/vite";
import postgres from "postgres";

const app = express();

// Configure body parser with larger size limit for file uploads
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// OAuth callback under /api/oauth/callback
registerOAuthRoutes(app);

// Lightweight questions endpoint for production (keeps payload small)
app.get("/api/questions", async (_req, res) => {
  const send = (code: number, body: any) => res.status(code).json(body);
  const baseUrl = process.env.DATABASE_URL || "";
  if (!baseUrl) return send(200, { items: [] });
  const url = baseUrl.includes("sslmode=") ? baseUrl : (baseUrl.includes("?") ? `${baseUrl}&sslmode=require` : `${baseUrl}?sslmode=require`);

  let sql: ReturnType<typeof postgres> | null = null;
  try {
    sql = postgres(url, { prepare: false });
    const rows = await sql`
      select id, "subjectId", title, statement, solution, difficulty, year, "sourceUrl", "imageUrl", choices, "correctChoice"
      from questions
      order by id desc
      limit 1000
    `;
    return send(200, { items: rows });
  } catch (err) {
    console.error("[Serverless] GET /api/questions failed", err);
    return send(200, { items: [] });
  } finally {
    try { if (sql) await sql.end({ timeout: 1 }); } catch {}
  }
});

// tRPC API
app.use(
  "/api/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);

// Serve static files in production
if (process.env.NODE_ENV === "production") {
  serveStatic(app);
} else {
  // In development, you might want to use Vite
  // setupVite(app, server);
}

// Export for Vercel
export default app;

