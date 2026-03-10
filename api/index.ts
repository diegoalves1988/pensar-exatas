/**
 * Vercel Serverless Function Entry Point — self-contained, no server/ imports.
 * Uses only npm packages so Vercel can bundle reliably without path-alias issues.
 */

import express from "express";
import postgres from "postgres";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import { SignJWT, jwtVerify } from "jose";
import { parse as parseCookieHeader } from "cookie";

// ─── Constants ────────────────────────────────────────────────────────────────
const COOKIE_NAME = "app_session_id";
const ONE_YEAR_MS = 1000 * 60 * 60 * 24 * 365;
const COOKIE_OPTIONS = { httpOnly: true, path: "/", sameSite: "none" as const, secure: true };

// ─── DB helpers ───────────────────────────────────────────────────────────────
function getDb() {
  const raw = process.env.DATABASE_URL || "";
  if (!raw) return null;
  const url = raw.includes("sslmode=") ? raw : raw.includes("?") ? `${raw}&sslmode=require` : `${raw}?sslmode=require`;
  return postgres(url, { prepare: false });
}

// ─── JWT helpers ──────────────────────────────────────────────────────────────
function jwtSecret() {
  return new TextEncoder().encode(process.env.JWT_SECRET || "dev-secret-change-me");
}

async function signToken(openId: string, name: string) {
  const exp = Math.floor((Date.now() + ONE_YEAR_MS) / 1000);
  return new SignJWT({ openId, appId: process.env.VITE_APP_ID || "", name })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setExpirationTime(exp)
    .sign(jwtSecret());
}

async function verifyToken(token: string | undefined) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, jwtSecret(), { algorithms: ["HS256"] });
    return payload as { openId: string; name: string; appId: string };
  } catch { return null; }
}

function getCookie(req: any) {
  const cookieHeader: string = req?.headers?.cookie ?? "";
  const cookies = parseCookieHeader(cookieHeader);
  return cookies[COOKIE_NAME];
}

// ─── App ──────────────────────────────────────────────────────────────────────
const app = express();
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Health check
app.get("/api/health", (_req: any, res: any) => res.json({ ok: true }));

// ── GET /api/me ───────────────────────────────────────────────────────────────
app.get("/api/me", async (req: any, res: any) => {
  const sql = getDb();
  if (!sql) return res.json(null);
  try {
    const session = await verifyToken(getCookie(req));
    if (!session) return res.json(null);
    const [user] = await sql`SELECT id, "openId", name, email, role FROM users WHERE "openId" = ${session.openId} LIMIT 1`;
    return res.json(user ?? null);
  } catch { return res.json(null); }
  finally { await sql.end({ timeout: 1 }).catch(() => {}); }
});

// ── POST /api/auth/register ───────────────────────────────────────────────────
app.post("/api/auth/register", async (req: any, res: any) => {
  const sql = getDb();
  if (!sql) return res.status(500).json({ error: "database not configured" });
  try {
    const { name, email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: "email and password are required" });

    const [existing] = await sql`SELECT id, "openId", "passwordHash" FROM users WHERE email = ${email} LIMIT 1`;
    if (existing?.passwordHash) return res.status(400).json({ error: "User already exists" });

    const openId = existing?.openId ?? `local:${nanoid()}`;
    const passwordHash = await bcrypt.hash(password, 10);
    const ownerOpenId = process.env.OWNER_OPEN_ID ?? "";
    const role = openId === ownerOpenId ? "admin" : "user";

    await sql`
      INSERT INTO users ("openId", name, email, "loginMethod", "passwordHash", role, "lastSignedIn")
      VALUES (${openId}, ${name ?? null}, ${email}, 'email', ${passwordHash}, ${role}, NOW())
      ON CONFLICT ("openId") DO UPDATE SET
        name = EXCLUDED.name,
        email = EXCLUDED.email,
        "passwordHash" = EXCLUDED."passwordHash",
        role = ${role},
        "lastSignedIn" = NOW()
    `;

    const token = await signToken(openId, name ?? "");
    res.cookie(COOKIE_NAME, token, { ...COOKIE_OPTIONS, maxAge: ONE_YEAR_MS });
    return res.json({ ok: true });
  } catch (err) {
    console.error("[Auth] register failed", err);
    return res.status(500).json({ error: "register failed" });
  } finally { await sql.end({ timeout: 1 }).catch(() => {}); }
});

// ── POST /api/auth/login ──────────────────────────────────────────────────────
app.post("/api/auth/login", async (req: any, res: any) => {
  const sql = getDb();
  if (!sql) return res.status(500).json({ error: "database not configured" });
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: "email and password are required" });

    const [user] = await sql`SELECT id, "openId", name, "passwordHash", role FROM users WHERE email = ${email} LIMIT 1`;
    if (!user?.passwordHash) return res.status(400).json({ error: "invalid credentials" });

    const ok = await bcrypt.compare(password, String(user.passwordHash));
    if (!ok) return res.status(400).json({ error: "invalid credentials" });

    const token = await signToken(user.openId, user.name ?? "");
    res.cookie(COOKIE_NAME, token, { ...COOKIE_OPTIONS, maxAge: ONE_YEAR_MS });
    return res.json({ ok: true });
  } catch (err) {
    console.error("[Auth] login failed", err);
    return res.status(500).json({ error: "login failed" });
  } finally { await sql.end({ timeout: 1 }).catch(() => {}); }
});

// ── POST /api/auth/logout ─────────────────────────────────────────────────────
app.post("/api/auth/logout", (_req: any, res: any) => {
  res.clearCookie(COOKIE_NAME, { path: "/" });
  res.json({ ok: true });
});

// ── GET /api/subjects ─────────────────────────────────────────────────────────
app.get("/api/subjects", async (_req: any, res: any) => {
  const sql = getDb();
  if (!sql) return res.json({ items: [] });
  try {
    const rows = await sql`SELECT id, name, description, icon, color, "order" FROM subjects ORDER BY "order" ASC, id ASC`;
    return res.json({ items: rows });
  } catch (err) {
    console.error("[API] GET /api/subjects failed", err);
    return res.json({ items: [] });
  } finally { await sql.end({ timeout: 1 }).catch(() => {}); }
});

// ── GET /api/questions ────────────────────────────────────────────────────────
app.get("/api/questions", async (_req: any, res: any) => {
  const sql = getDb();
  if (!sql) return res.json({ items: [] });
  try {
    const rows = await sql`
      SELECT id, "subjectId", title, statement, solution, difficulty, year,
             "sourceUrl", "imageUrl", choices, "correctChoice"
      FROM questions ORDER BY id DESC LIMIT 1000
    `;
    return res.json({ items: rows });
  } catch (err) {
    console.error("[API] GET /api/questions failed", err);
    return res.json({ items: [] });
  } finally { await sql.end({ timeout: 1 }).catch(() => {}); }
});

// ── POST /api/admin/questions ──────────────────────────────────────────────────
app.post("/api/admin/questions", async (req: any, res: any) => {
  const sql = getDb();
  if (!sql) return res.status(500).json({ error: "database not configured" });
  try {
    // Auth + admin check
    const session = await verifyToken(getCookie(req));
    if (!session) return res.status(401).json({ error: "not authenticated" });
    const [user] = await sql`SELECT role FROM users WHERE "openId" = ${session.openId} LIMIT 1`;
    if (!user || user.role !== "admin") return res.status(403).json({ error: "forbidden" });

    const { subjectId, title, statement, solution, difficulty, year, sourceUrl, imageUrl, choices, correctChoice } = req.body || {};
    if (!subjectId || !title || !statement || !solution) {
      return res.status(400).json({ error: "subjectId, title, statement and solution are required" });
    }

    const safeChoices = Array.isArray(choices) && choices.length >= 2 ? JSON.stringify(choices) : null;
    const safeCorrectChoice = typeof correctChoice === "number" ? correctChoice : null;
    const safeYear = typeof year === "number" ? year : null;

    const [row] = await sql`
      INSERT INTO questions ("subjectId", title, statement, solution, difficulty, year, "sourceUrl", "imageUrl", choices, "correctChoice")
      VALUES (
        ${Number(subjectId)},
        ${String(title).trim()},
        ${String(statement).trim()},
        ${String(solution).trim()},
        ${difficulty || 'medium'},
        ${safeYear},
        ${sourceUrl || null},
        ${imageUrl || null},
        ${safeChoices},
        ${safeCorrectChoice}
      )
      RETURNING id
    `;
    return res.json({ ok: true, id: row.id });
  } catch (err) {
    console.error("[API] POST /api/admin/questions failed", err);
    return res.status(500).json({ error: "failed to create question" });
  } finally { await sql.end({ timeout: 1 }).catch(() => {}); }
});

// ── tRPC placeholder (disabled until import chain issues are resolved) ─────────
app.use("/api/trpc", (_req: any, res: any) => res.status(503).json({ error: "tRPC not available" }));

export default app;

