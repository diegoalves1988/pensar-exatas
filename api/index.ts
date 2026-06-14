/**
 * Vercel Serverless Function Entry Point — self-contained, no server/ imports.
 * Uses only npm packages so Vercel can bundle reliably without path-alias issues.
 */

import express from "express";
import postgres from "postgres";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import { Resend } from "resend";
import { SignJWT, jwtVerify } from "jose";
import { parse as parseCookieHeader } from "cookie";
import { timingSafeEqual } from "crypto";

// ─── Constants ────────────────────────────────────────────────────────────────
const COOKIE_NAME = "app_session_id";
const ONE_YEAR_MS = 1000 * 60 * 60 * 24 * 365;
const COOKIE_OPTIONS = { httpOnly: true, path: "/", sameSite: "none" as const, secure: true };
let cachedSql: any = null;
let resolutionsSchemaEnsured = false;
let questionReportsSchemaEnsured = false;

// ─── DB helpers ───────────────────────────────────────────────────────────────
function getDb() {
  if (cachedSql) return cachedSql;
  const raw = process.env.DATABASE_URL || "";
  if (!raw) return null;
  const url = raw.includes("sslmode=") ? raw : raw.includes("?") ? `${raw}&sslmode=require` : `${raw}?sslmode=require`;
  const sql = postgres(url, { prepare: false, max: 5 });
  // Keep a warm pooled connection in serverless; endpoints already call sql.end() in finally blocks.
  // Override end() to no-op so we do not pay reconnect cost on every request.
  (sql as any).end = async () => {};
  cachedSql = sql;
  return cachedSql;
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

async function getSessionUser(req: any, sql: any) {
  const session = await verifyToken(getCookie(req));
  if (!session) return null;
  const [user] = await sql`SELECT id, "openId", name, email, role FROM users WHERE "openId" = ${session.openId} LIMIT 1`;
  return user ?? null;
}

async function ensureResolutionsTable(sql: any) {
  if (resolutionsSchemaEnsured) return;
  await sql`
    CREATE TABLE IF NOT EXISTS user_question_resolutions (
      id bigserial PRIMARY KEY,
      "userId" integer NOT NULL,
      "questionId" integer NOT NULL,
      "selectedChoice" integer,
      "answeredCorrect" boolean,
      "createdAt" timestamptz NOT NULL DEFAULT NOW(),
      "updatedAt" timestamptz NOT NULL DEFAULT NOW(),
      UNIQUE ("userId", "questionId")
    )
  `;

  await sql`
    ALTER TABLE user_question_resolutions
    ADD COLUMN IF NOT EXISTS "selectedChoice" integer
  `;
  await sql`
    ALTER TABLE user_question_resolutions
    ADD COLUMN IF NOT EXISTS "updatedAt" timestamptz NOT NULL DEFAULT NOW()
  `;
  resolutionsSchemaEnsured = true;
}

async function ensureQuestionReportsTable(sql: any) {
  if (questionReportsSchemaEnsured) return;
  await sql`
    CREATE TABLE IF NOT EXISTS question_reports (
      id bigserial PRIMARY KEY,
      "userId" integer NOT NULL,
      "questionId" integer NOT NULL,
      category varchar(100) NOT NULL,
      description text,
      status varchar(32) NOT NULL DEFAULT 'open',
      "createdAt" timestamptz NOT NULL DEFAULT NOW(),
      "updatedAt" timestamptz NOT NULL DEFAULT NOW()
    )
  `;
  questionReportsSchemaEnsured = true;
}

async function recalculateUserProgress(sql: any, userId: number) {
  const attempts = await sql`
    SELECT "answeredCorrect"
    FROM user_question_resolutions
    WHERE "userId" = ${userId}
    ORDER BY "createdAt" ASC, id ASC
  `;

  const questionsResolved = attempts.length;
  let totalPoints = 0;
  let currentStreak = 0;
  let bestStreak = 0;
  let runningStreak = 0;

  for (const attempt of attempts) {
    const correct = Boolean(attempt.answeredCorrect);
    totalPoints += correct ? 1 : -1;
    if (correct) {
      runningStreak += 1;
      if (runningStreak > bestStreak) bestStreak = runningStreak;
    } else {
      runningStreak = 0;
    }
  }

  for (let i = attempts.length - 1; i >= 0; i -= 1) {
    if (attempts[i].answeredCorrect) {
      currentStreak += 1;
    } else {
      break;
    }
  }

  const existing = await sql`
    SELECT id
    FROM user_progress
    WHERE "userId" = ${userId}
    ORDER BY id ASC
  `;

  if (existing.length === 0) {
    await sql`
      INSERT INTO user_progress ("userId", "questionsResolved", "totalPoints", "currentStreak", "bestStreak", "createdAt", "updatedAt")
      VALUES (${userId}, ${questionsResolved}, ${totalPoints}, ${currentStreak}, ${bestStreak}, NOW(), NOW())
    `;
    return;
  }

  const keepId = Number(existing[0].id);
  await sql`
    UPDATE user_progress
    SET
      "questionsResolved" = ${questionsResolved},
      "totalPoints" = ${totalPoints},
      "currentStreak" = ${currentStreak},
      "bestStreak" = ${bestStreak},
      "updatedAt" = NOW()
    WHERE id = ${keepId}
  `;

  if (existing.length > 1) {
    await sql`
      DELETE FROM user_progress
      WHERE "userId" = ${userId} AND id <> ${keepId}
    `;
  }
}

function sanitizeQuestionText(value: any): string {
  const input = String(value ?? "");
  return input
    // remove common import artifacts
    .replace(/(^|\s)\\?(undefined|null)(?=\s|$|[.,;:!?])/gi, " ")
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function normalizeAdminChoicesInput(choices: any): any[] {
  return Array.isArray(choices)
    ? choices
        .map((choice: any) => {
          if (typeof choice === "string") {
            const text = choice.trim();
            return text ? text : null;
          }
          if (choice && typeof choice === "object") {
            const text = choice.text == null ? null : String(choice.text).trim();
            const image = choice.imageUrl == null ? null : String(choice.imageUrl).trim();
            if (!text && !image) return null;
            return { text, imageUrl: image };
          }
          return null;
        })
        .filter(Boolean)
    : [];
}

// ─── Supabase Storage helpers ─────────────────────────────────────────────────
function getSupabaseConfig() {
  const dbUrl = process.env.DATABASE_URL || "";
  const match = dbUrl.match(/postgres\.([^:@]+)/);
  const ref = match?.[1] || "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  return { url: ref ? `https://${ref}.supabase.co` : "", serviceKey, ref };
}

const STORAGE_BUCKET = "question-images";

async function ensureBucket(supabaseUrl: string, serviceKey: string) {
  const headers = { Authorization: `Bearer ${serviceKey}`, apikey: serviceKey, "Content-Type": "application/json" };
  // Try to get bucket; if 404, create it
  const check = await fetch(`${supabaseUrl}/storage/v1/bucket/${STORAGE_BUCKET}`, { headers });
  if (check.ok) return;
  const create = await fetch(`${supabaseUrl}/storage/v1/bucket`, {
    method: "POST",
    headers,
    body: JSON.stringify({ id: STORAGE_BUCKET, name: STORAGE_BUCKET, public: true }),
  });
  if (!create.ok) {
    const msg = await create.text().catch(() => "");
    throw new Error(`Failed to create storage bucket: ${create.status} ${msg}`);
  }
}

let passwordResetSchemaEnsured = false;

async function ensurePasswordResetColumns(sql: any) {
  if (passwordResetSchemaEnsured) return;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS "emailVerified" boolean NOT NULL DEFAULT false`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS "verificationToken" varchar(64)`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS "verificationTokenExpiresAt" timestamptz`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS "passwordResetToken" varchar(64)`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS "passwordResetTokenExpiresAt" timestamptz`;
  passwordResetSchemaEnsured = true;
}

function htmlEscape(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getAppBaseUrl(): string {
  // Use only env vars to prevent host-header forgery
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:5173";
}

/** Generate a cryptographically random 6-digit numeric code without modulo bias. */
function generateVerificationCode(): string {
  const MAX = 1_000_000;
  const limit = Math.floor(0x1_0000_0000 / MAX) * MAX;
  const buf = new Uint32Array(1);
  do {
    crypto.getRandomValues(buf);
  } while (buf[0] >= limit);
  return String(buf[0] % MAX).padStart(6, "0");
}

async function sendVerificationEmail(to: string, code: string): Promise<void> {
  if (process.env.RESEND_API_KEY) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const from = process.env.RESEND_FROM || "Pensar Exatas <noreply@pensarexatas.com.br>";
    try {
      await resend.emails.send({
        from,
        to,
        subject: "Pensar Exatas – código de verificação",
        text: `Olá!\n\nSeu código de verificação é: ${code}\n\nEsse código expira em 24 horas.\n\nSe você não criou uma conta em Pensar Exatas, pode ignorar este e-mail.`,
        html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto"><h2 style="color:#1C3550">Verificação de e-mail – Pensar Exatas</h2><p>Olá!</p><p>Use o código abaixo para verificar seu e-mail:</p><div style="font-size:2rem;font-weight:bold;letter-spacing:.4rem;background:#f3f4f6;border-radius:8px;padding:16px 24px;display:inline-block;color:#1C3550;margin:16px 0">${code}</div><p style="color:#6b7280;font-size:.875rem">Esse código expira em 24 horas.<br>Se você não criou uma conta em Pensar Exatas, pode ignorar este e-mail.</p></div>`,
      });
    } catch (err) {
      console.error("[Email] Failed to send verification email", err);
      console.info(`[Email] Verification code for ${to}: ${code}`);
    }
  } else {
    console.info(`[Email] Verification code for ${to}: ${code}`);
  }
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
    // Short private cache so repeated navigations within the same browser session
    // don't always hit the database. stale-while-revalidate lets the browser
    // return the cached value instantly and refresh in the background.
    res.setHeader("Cache-Control", "private, max-age=10, stale-while-revalidate=60");
    return res.json(user ?? null);
  } catch { return res.json(null); }
  finally { await sql.end({ timeout: 1 }).catch(() => {}); }
});

// ── GET /api/profile/summary ──────────────────────────────────────────────────
app.get("/api/profile/summary", async (req: any, res: any) => {
  const sql = getDb();
  if (!sql) return res.status(500).json({ error: "database not configured" });
  try {
    const user = await getSessionUser(req, sql);
    if (!user) return res.status(401).json({ error: "not authenticated" });

    // Run all three queries in parallel instead of sequentially to minimize latency.
    const [[progress], [favorites], [todayRow]] = await Promise.all([
      sql`
        SELECT COALESCE("questionsResolved", 0) as "questionsResolved",
               COALESCE("totalPoints", 0) as "totalPoints",
               COALESCE("currentStreak", 0) as "currentStreak",
               COALESCE("bestStreak", 0) as "bestStreak"
        FROM user_progress
        WHERE "userId" = ${user.id}
        ORDER BY "updatedAt" DESC, id DESC
        LIMIT 1
      `,
      sql`
        SELECT COUNT(*)::int as count
        FROM user_favorites
        WHERE "userId" = ${user.id}
      `,
      sql`
        SELECT COUNT(*)::int as count
        FROM user_question_resolutions
        WHERE "userId" = ${user.id}
          AND "updatedAt" >= NOW() AT TIME ZONE 'America/Sao_Paulo' - INTERVAL '1 day'
          AND DATE("updatedAt" AT TIME ZONE 'America/Sao_Paulo') = CURRENT_DATE AT TIME ZONE 'America/Sao_Paulo'
      `,
    ]);

    // Short private cache: serve the cached value instantly on repeated visits
    // and revalidate in the background.
    res.setHeader("Cache-Control", "private, max-age=10, stale-while-revalidate=60");
    return res.json({
      favoritesCount: favorites?.count ?? 0,
      questionsResolved: progress?.questionsResolved ?? 0,
      totalPoints: progress?.totalPoints ?? 0,
      currentStreak: progress?.currentStreak ?? 0,
      bestStreak: progress?.bestStreak ?? 0,
      questionsToday: todayRow?.count ?? 0,
    });
  } catch (err) {
    console.error("[API] GET /api/profile/summary failed", err);
    return res.status(500).json({ error: "failed to load profile summary" });
  } finally { await sql.end({ timeout: 1 }).catch(() => {}); }
});

// ── GET /api/favorites ────────────────────────────────────────────────────────
app.get("/api/favorites", async (req: any, res: any) => {
  const sql = getDb();
  if (!sql) return res.status(500).json({ error: "database not configured" });
  try {
    const user = await getSessionUser(req, sql);
    if (!user) return res.status(401).json({ error: "not authenticated" });
    const rows = await sql`
      SELECT q.id, q.title, q."subjectId"
      FROM user_favorites uf
      JOIN questions q ON q.id = uf."questionId"
      WHERE uf."userId" = ${user.id}
      ORDER BY uf.id DESC
    `;
    return res.json({ items: rows });
  } catch (err) {
    console.error("[API] GET /api/favorites failed", err);
    return res.status(500).json({ error: "failed to load favorites" });
  } finally { await sql.end({ timeout: 1 }).catch(() => {}); }
});

// ── POST /api/favorites ───────────────────────────────────────────────────────
app.post("/api/favorites", async (req: any, res: any) => {
  const sql = getDb();
  if (!sql) return res.status(500).json({ error: "database not configured" });
  try {
    const user = await getSessionUser(req, sql);
    if (!user) return res.status(401).json({ error: "not authenticated" });
    const { questionId } = req.body || {};
    if (!questionId) return res.status(400).json({ error: "questionId is required" });
    await sql`
      INSERT INTO user_favorites ("userId", "questionId")
      VALUES (${user.id}, ${Number(questionId)})
      ON CONFLICT DO NOTHING
    `;
    return res.json({ ok: true });
  } catch (err) {
    console.error("[API] POST /api/favorites failed", err);
    return res.status(500).json({ error: "failed to add favorite" });
  } finally { await sql.end({ timeout: 1 }).catch(() => {}); }
});

// ── DELETE /api/favorites/:questionId ─────────────────────────────────────────
app.delete("/api/favorites/:questionId", async (req: any, res: any) => {
  const sql = getDb();
  if (!sql) return res.status(500).json({ error: "database not configured" });
  try {
    const user = await getSessionUser(req, sql);
    if (!user) return res.status(401).json({ error: "not authenticated" });
    await sql`
      DELETE FROM user_favorites
      WHERE "userId" = ${user.id} AND "questionId" = ${Number(req.params.questionId)}
    `;
    return res.json({ ok: true });
  } catch (err) {
    console.error("[API] DELETE /api/favorites failed", err);
    return res.status(500).json({ error: "failed to remove favorite" });
  } finally { await sql.end({ timeout: 1 }).catch(() => {}); }
});

// ── POST /api/auth/register ───────────────────────────────────────────────────
app.post("/api/auth/register", async (req: any, res: any) => {
  const sql = getDb();
  if (!sql) return res.status(500).json({ error: "database not configured" });
  try {
    const { name, email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: "email and password are required" });

    // Basic email format validation (no regex to avoid ReDoS)
    const atIdx = email.indexOf("@");
    if (atIdx <= 0 || atIdx === email.length - 1 || !email.slice(atIdx + 1).includes(".")) {
      return res.status(400).json({ error: "invalid email format" });
    }

    await ensurePasswordResetColumns(sql);

    const [existing] = await sql`SELECT id, "openId", "passwordHash" FROM users WHERE email = ${email} LIMIT 1`;
    if (existing?.passwordHash) return res.status(400).json({ error: "User already exists" });

    const openId = existing?.openId ?? `local:${nanoid()}`;
    const passwordHash = await bcrypt.hash(password, 10);
    const ownerOpenId = process.env.OWNER_OPEN_ID ?? "";
    const role = openId === ownerOpenId ? "admin" : "user";

    await sql`
      INSERT INTO users ("openId", name, email, "loginMethod", "passwordHash", role, "lastSignedIn", "emailVerified")
      VALUES (${openId}, ${name ?? null}, ${email}, 'email', ${passwordHash}, ${role}, NOW(), false)
      ON CONFLICT ("openId") DO UPDATE SET
        name = EXCLUDED.name,
        email = EXCLUDED.email,
        "passwordHash" = EXCLUDED."passwordHash",
        role = ${role},
        "lastSignedIn" = NOW()
    `;

    // Generate and store a 6-digit verification code (expires in 24 hours)
    const code = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await sql`
      UPDATE users
      SET "verificationToken" = ${code}, "verificationTokenExpiresAt" = ${expiresAt}
      WHERE "openId" = ${openId}
    `;

    await sendVerificationEmail(email, code);

    return res.json({ ok: true, requiresEmailVerification: true });
  } catch (err) {
    console.error("[Auth] register failed", err);
    return res.status(500).json({ error: "register failed" });
  } finally { await sql.end({ timeout: 1 }).catch(() => {}); }
});

// ── POST /api/auth/verify-email ───────────────────────────────────────────────
app.post("/api/auth/verify-email", async (req: any, res: any) => {
  const sql = getDb();
  if (!sql) return res.status(500).json({ error: "database not configured" });
  try {
    const { email, code } = req.body || {};
    if (!email || !code) return res.status(400).json({ error: "email and code are required" });

    await ensurePasswordResetColumns(sql);

    const [user] = await sql`
      SELECT id, "openId", name, "emailVerified", "verificationToken", "verificationTokenExpiresAt"
      FROM users WHERE email = ${email} LIMIT 1
    `;

    if (!user) return res.status(400).json({ error: "invalid verification code" });

    if (user.emailVerified) {
      // Already verified – just create a session
      const token = await signToken(user.openId, user.name ?? "");
      res.cookie(COOKIE_NAME, token, { httpOnly: true, path: "/", sameSite: "none" as const, secure: true, maxAge: ONE_YEAR_MS });
      return res.json({ ok: true });
    }

    if (!user.verificationToken || !user.verificationTokenExpiresAt || new Date(user.verificationTokenExpiresAt) < new Date()) {
      return res.status(400).json({ error: "invalid or expired verification code" });
    }

    // Constant-time comparison to prevent timing attacks
    const expected = Buffer.from(user.verificationToken);
    const actual = Buffer.from(String(code).padStart(6, "0").slice(0, 6));
    const codesMatch = expected.length === actual.length && timingSafeEqual(expected, actual);

    if (!codesMatch) return res.status(400).json({ error: "invalid or expired verification code" });

    await sql`
      UPDATE users
      SET "emailVerified" = true, "verificationToken" = NULL, "verificationTokenExpiresAt" = NULL
      WHERE "openId" = ${user.openId}
    `;

    const token = await signToken(user.openId, user.name ?? "");
    res.cookie(COOKIE_NAME, token, { httpOnly: true, path: "/", sameSite: "none" as const, secure: true, maxAge: ONE_YEAR_MS });
    return res.json({ ok: true });
  } catch (err) {
    console.error("[Auth] verify-email failed", err);
    return res.status(500).json({ error: "verification failed" });
  } finally { await sql.end({ timeout: 1 }).catch(() => {}); }
});

// ── POST /api/auth/resend-verification ───────────────────────────────────────
app.post("/api/auth/resend-verification", async (req: any, res: any) => {
  const sql = getDb();
  if (!sql) return res.status(500).json({ error: "database not configured" });
  try {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ error: "email is required" });

    await ensurePasswordResetColumns(sql);

    const [user] = await sql`
      SELECT "openId", "emailVerified" FROM users WHERE email = ${email} LIMIT 1
    `;

    // Return success regardless to avoid leaking user existence
    if (!user || user.emailVerified) return res.json({ ok: true });

    const code = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await sql`
      UPDATE users
      SET "verificationToken" = ${code}, "verificationTokenExpiresAt" = ${expiresAt}
      WHERE "openId" = ${user.openId}
    `;

    await sendVerificationEmail(email, code);

    return res.json({ ok: true });
  } catch (err) {
    console.error("[Auth] resend-verification failed", err);
    return res.status(500).json({ error: "resend failed" });
  } finally { await sql.end({ timeout: 1 }).catch(() => {}); }
});

// ── POST /api/auth/login ──────────────────────────────────────────────────────
app.post("/api/auth/login", async (req: any, res: any) => {
  const sql = getDb();
  if (!sql) return res.status(500).json({ error: "database not configured" });
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: "email and password are required" });

    await ensurePasswordResetColumns(sql);

    const [user] = await sql`SELECT id, "openId", name, "passwordHash", role, "emailVerified" FROM users WHERE email = ${email} LIMIT 1`;
    if (!user?.passwordHash) return res.status(400).json({ error: "invalid credentials" });

    const ok = await bcrypt.compare(password, String(user.passwordHash));
    if (!ok) return res.status(400).json({ error: "invalid credentials" });

    // Block login until email is verified
    if (!user.emailVerified) return res.status(403).json({ error: "email_not_verified" });

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

// ── POST /api/auth/forgot-password ───────────────────────────────────────────
app.post("/api/auth/forgot-password", async (req: any, res: any) => {
  const sql = getDb();
  if (!sql) return res.status(500).json({ error: "database not configured" });
  try {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ error: "email is required" });

    await ensurePasswordResetColumns(sql);

    const [user] = await sql`SELECT "openId" FROM users WHERE email = ${email} LIMIT 1`;
    if (!user) {
      // Return success to avoid leaking user existence
      return res.json({ ok: true });
    }

    const token = nanoid(32);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await sql`
      UPDATE users
      SET "passwordResetToken" = ${token}, "passwordResetTokenExpiresAt" = ${expiresAt}
      WHERE "openId" = ${user.openId}
    `;

    const baseUrl = getAppBaseUrl();
    const resetUrl = `${baseUrl}/redefinir-senha?token=${encodeURIComponent(token)}`;
    const safeResetUrl = htmlEscape(resetUrl);

    // Send email via Resend if configured, otherwise log to console
    if (process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const from = process.env.RESEND_FROM || "Pensar Exatas <noreply@pensarexatas.com.br>";
      try {
        await resend.emails.send({
          from,
          to: email,
          subject: "Pensar Exatas – redefinição de senha",
          text: `Olá!\n\nClique no link abaixo para redefinir sua senha (válido por 1 hora):\n\n${resetUrl}\n\nSe você não solicitou isso, ignore este e-mail.`,
          html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto"><h2 style="color:#1C3550">Redefinição de senha – Pensar Exatas</h2><p>Clique no botão abaixo para criar uma nova senha. Válido por <strong>1 hora</strong>.</p><div style="margin:24px 0"><a href="${safeResetUrl}" style="background:#7c3aed;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:bold;display:inline-block">Redefinir senha</a></div><p style="color:#6b7280;font-size:.875rem">Se você não solicitou isso, ignore este e-mail.</p></div>`,
        });
      } catch (err) {
        console.error("[Email] Failed to send password reset email", err);
        console.info(`[Email] Password reset link for ${email}: ${resetUrl}`);
      }
    } else {
      console.info(`[Email] Password reset link for ${email}: ${resetUrl}`);
    }

    return res.json({ ok: true });
  } catch (err) {
    console.error("[Auth] forgot-password failed", err);
    return res.status(500).json({ error: "forgot password failed" });
  } finally { await sql.end({ timeout: 1 }).catch(() => {}); }
});

// ── POST /api/auth/reset-password ────────────────────────────────────────────
app.post("/api/auth/reset-password", async (req: any, res: any) => {
  const sql = getDb();
  if (!sql) return res.status(500).json({ error: "database not configured" });
  try {
    const { token, password } = req.body || {};
    if (!token || !password) return res.status(400).json({ error: "token and password are required" });
    if (password.length < 6) return res.status(400).json({ error: "password must be at least 6 characters" });

    await ensurePasswordResetColumns(sql);

    const [user] = await sql`
      SELECT "openId", "passwordResetToken", "passwordResetTokenExpiresAt"
      FROM users
      WHERE "passwordResetToken" = ${token}
      LIMIT 1
    `;

    if (!user || !user.passwordResetTokenExpiresAt || new Date(user.passwordResetTokenExpiresAt) < new Date()) {
      return res.status(400).json({ error: "invalid or expired reset token" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await sql`
      UPDATE users
      SET "passwordHash" = ${passwordHash}, "passwordResetToken" = NULL, "passwordResetTokenExpiresAt" = NULL
      WHERE "openId" = ${user.openId}
    `;

    return res.json({ ok: true });
  } catch (err) {
    console.error("[Auth] reset-password failed", err);
    return res.status(500).json({ error: "reset password failed" });
  } finally { await sql.end({ timeout: 1 }).catch(() => {}); }
});

// ── GET /api/subjects ─────────────────────────────────────────────────────────
app.get("/api/subjects", async (_req: any, res: any) => {
  // Cache static-ish content at the CDN edge
  res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=1800");
  const sql = getDb();
  if (!sql) return res.json({ items: [] });
  try {
    const rows = await sql`SELECT id, name, description, icon, color, area, "order" FROM subjects ORDER BY "order" ASC, id ASC`;
    return res.json({ items: rows });
  } catch (err) {
    console.error("[API] GET /api/subjects failed", err);
    return res.json({ items: [] });
  } finally { await sql.end({ timeout: 1 }).catch(() => {}); }
});

// ── GET /api/questions ────────────────────────────────────────────────────────
app.get("/api/questions", async (_req: any, res: any) => {
  // Cache question list at the CDN edge to reduce cold-load latency
  res.setHeader("Cache-Control", "public, s-maxage=120, stale-while-revalidate=900");
  const sql = getDb();
  if (!sql) return res.json({ items: [] });
  try {
    const rows = await sql`
            SELECT id, "subjectId", title, statement, solution, year,
             "sourceUrl", "imageUrl", choices, "correctChoice"
      FROM questions ORDER BY id DESC LIMIT 1000
    `;
    const sanitizedRows = rows.map((row: any) => ({
      ...row,
      title: sanitizeQuestionText(row.title),
      statement: sanitizeQuestionText(row.statement),
      solution: sanitizeQuestionText(row.solution),
    }));
    return res.json({ items: sanitizedRows });
  } catch (err) {
    console.error("[API] GET /api/questions failed", err);
    return res.json({ items: [] });
  } finally { await sql.end({ timeout: 1 }).catch(() => {}); }
});

// ── GET /api/questions/resolutions ───────────────────────────────────────────
app.get("/api/questions/resolutions", async (req: any, res: any) => {
  const sql = getDb();
  if (!sql) return res.status(500).json({ error: "database not configured" });
  try {
    const user = await getSessionUser(req, sql);
    if (!user) return res.status(401).json({ error: "not authenticated" });

    await ensureResolutionsTable(sql);
    const rows = await sql`
      SELECT "questionId", "selectedChoice", "answeredCorrect"
      FROM user_question_resolutions
      WHERE "userId" = ${user.id}
    `;

    return res.json({ items: rows });
  } catch (err) {
    console.error("[API] GET /api/questions/resolutions failed", err);
    return res.status(500).json({ error: "failed to load saved resolutions" });
  } finally { await sql.end({ timeout: 1 }).catch(() => {}); }
});

// ── POST /api/questions/:id/resolve ──────────────────────────────────────────
app.post("/api/questions/:id/resolve", async (req: any, res: any) => {
  const sql = getDb();
  if (!sql) return res.status(500).json({ error: "database not configured" });
  try {
    const user = await getSessionUser(req, sql);
    if (!user) return res.status(401).json({ error: "not authenticated" });

    const questionId = Number(req.params.id);
    if (!Number.isFinite(questionId) || questionId <= 0) {
      return res.status(400).json({ error: "invalid question id" });
    }

    await ensureResolutionsTable(sql);
    if (typeof req.body?.answeredCorrect !== "boolean") {
      return res.status(400).json({ error: "answeredCorrect must be a boolean" });
    }
    if (typeof req.body?.selectedChoice !== "number" || req.body.selectedChoice < 0) {
      return res.status(400).json({ error: "selectedChoice must be a non-negative number" });
    }

    const answeredCorrect = req.body.answeredCorrect;
    const selectedChoice = req.body.selectedChoice;
    await sql`
      INSERT INTO user_question_resolutions ("userId", "questionId", "selectedChoice", "answeredCorrect", "updatedAt")
      VALUES (${user.id}, ${questionId}, ${selectedChoice}, ${answeredCorrect}, NOW())
      ON CONFLICT ("userId", "questionId") DO UPDATE SET
        "selectedChoice" = EXCLUDED."selectedChoice",
        "answeredCorrect" = EXCLUDED."answeredCorrect",
        "updatedAt" = NOW()
    `;

    await recalculateUserProgress(sql, Number(user.id));

    return res.json({ ok: true });
  } catch (err) {
    console.error("[API] POST /api/questions/:id/resolve failed", err);
    return res.status(500).json({ error: "failed to save question resolution" });
  } finally { await sql.end({ timeout: 1 }).catch(() => {}); }
});

// ── DELETE /api/questions/:id/resolve ───────────────────────────────────────
app.delete("/api/questions/:id/resolve", async (req: any, res: any) => {
  const sql = getDb();
  if (!sql) return res.status(500).json({ error: "database not configured" });
  try {
    const user = await getSessionUser(req, sql);
    if (!user) return res.status(401).json({ error: "not authenticated" });

    const questionId = Number(req.params.id);
    if (!Number.isFinite(questionId) || questionId <= 0) {
      return res.status(400).json({ error: "invalid question id" });
    }

    await ensureResolutionsTable(sql);
    await sql`
      DELETE FROM user_question_resolutions
      WHERE "userId" = ${user.id} AND "questionId" = ${questionId}
    `;

    await recalculateUserProgress(sql, Number(user.id));
    return res.json({ ok: true });
  } catch (err) {
    console.error("[API] DELETE /api/questions/:id/resolve failed", err);
    return res.status(500).json({ error: "failed to remove question resolution" });
  } finally { await sql.end({ timeout: 1 }).catch(() => {}); }
});

// ── POST /api/questions/:id/report ──────────────────────────────────────────
app.post("/api/questions/:id/report", async (req: any, res: any) => {
  const sql = getDb();
  if (!sql) return res.status(500).json({ error: "database not configured" });
  try {
    const user = await getSessionUser(req, sql);
    if (!user) return res.status(401).json({ error: "not authenticated" });

    const questionId = Number(req.params.id);
    if (!Number.isFinite(questionId) || questionId <= 0) {
      return res.status(400).json({ error: "invalid question id" });
    }

    const allowedCategories = [
      "formatacao",
      "erro_na_resposta",
      "erro_no_enunciado",
      "erro_nas_alternativas",
      "nenhuma_resposta_aplicavel",
      "outro",
    ];

    const category = String(req.body?.category || "");
    const description = req.body?.description == null ? null : String(req.body.description).slice(0, 2000);

    if (!allowedCategories.includes(category)) {
      return res.status(400).json({ error: "invalid category" });
    }

    await ensureQuestionReportsTable(sql);

    await sql`
      INSERT INTO question_reports ("userId", "questionId", category, description)
      VALUES (${user.id}, ${questionId}, ${category}, ${description})
    `;

    return res.json({ ok: true });
  } catch (err) {
    console.error("[API] POST /api/questions/:id/report failed", err);
    return res.status(500).json({ error: "failed to report question issue" });
  } finally { await sql.end({ timeout: 1 }).catch(() => {}); }
});

// ── GET /api/admin/question-reports ─────────────────────────────────────────
app.get("/api/admin/question-reports", async (req: any, res: any) => {
  const sql = getDb();
  if (!sql) return res.status(500).json({ error: "database not configured" });
  try {
    const user = await getSessionUser(req, sql);
    if (!user) return res.status(401).json({ error: "not authenticated" });
    if (user.role !== "admin") return res.status(403).json({ error: "forbidden" });

    await ensureQuestionReportsTable(sql);

    const rows = await sql`
      SELECT
        qr.id,
        qr.category,
        qr.description,
        qr.status,
        qr."createdAt",
        qr."questionId",
        q.title as "questionTitle",
        u.id as "reporterUserId",
        u.name as "reporterName",
        u.email as "reporterEmail"
      FROM question_reports qr
      LEFT JOIN questions q ON q.id = qr."questionId"
      LEFT JOIN users u ON u.id = qr."userId"
      ORDER BY qr."createdAt" DESC
      LIMIT 500
    `;

    return res.json({ items: rows });
  } catch (err) {
    console.error("[API] GET /api/admin/question-reports failed", err);
    return res.status(500).json({ error: "failed to load question reports" });
  } finally { await sql.end({ timeout: 1 }).catch(() => {}); }
});

// ── PATCH /api/admin/question-reports/:id/status ───────────────────────────
app.patch("/api/admin/question-reports/:id/status", async (req: any, res: any) => {
  const sql = getDb();
  if (!sql) return res.status(500).json({ error: "database not configured" });
  try {
    const user = await getSessionUser(req, sql);
    if (!user) return res.status(401).json({ error: "not authenticated" });
    if (user.role !== "admin") return res.status(403).json({ error: "forbidden" });

    const reportId = Number(req.params.id);
    if (!Number.isFinite(reportId) || reportId <= 0) {
      return res.status(400).json({ error: "invalid report id" });
    }

    const status = String(req.body?.status || "");
    const allowedStatuses = ["open", "resolved", "ignored"];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ error: "invalid status" });
    }

    const rows = await sql`
      UPDATE question_reports
      SET status = ${status}, "updatedAt" = NOW()
      WHERE id = ${reportId}
      RETURNING id, status, "updatedAt"
    `;

    if (rows.length === 0) {
      return res.status(404).json({ error: "report not found" });
    }

    return res.json({ ok: true, item: rows[0] });
  } catch (err) {
    console.error("[API] PATCH /api/admin/question-reports/:id/status failed", err);
    return res.status(500).json({ error: "failed to update question report status" });
  } finally { await sql.end({ timeout: 1 }).catch(() => {}); }
});

// ── GET /api/admin/questions ───────────────────────────────────────────────────
app.get("/api/admin/questions", async (req: any, res: any) => {
  const sql = getDb();
  if (!sql) return res.status(500).json({ error: "database not configured" });
  try {
    const user = await getSessionUser(req, sql);
    if (!user) return res.status(401).json({ error: "not authenticated" });
    if (user.role !== "admin") return res.status(403).json({ error: "forbidden" });
    const rows = await sql`
      SELECT q.id, q.title, q.year, q."subjectId", q."createdAt", s.name as "subjectName"
      FROM questions q
      LEFT JOIN subjects s ON s.id = q."subjectId"
      ORDER BY q.id DESC
      LIMIT 200
    `;
    return res.json({ items: rows });
  } catch (err) {
    console.error("[API] GET /api/admin/questions failed", err);
    return res.status(500).json({ error: "failed to load questions" });
  } finally { await sql.end({ timeout: 1 }).catch(() => {}); }
});

// ── GET /api/admin/questions/:id ─────────────────────────────────────────────
app.get("/api/admin/questions/:id", async (req: any, res: any) => {
  const sql = getDb();
  if (!sql) return res.status(500).json({ error: "database not configured" });
  try {
    const user = await getSessionUser(req, sql);
    if (!user) return res.status(401).json({ error: "not authenticated" });
    if (user.role !== "admin") return res.status(403).json({ error: "forbidden" });

    const questionId = Number(req.params.id);
    if (!Number.isFinite(questionId) || questionId <= 0) {
      return res.status(400).json({ error: "invalid question id" });
    }

    const [row] = await sql`
      SELECT id, "subjectId", title, statement, solution, year, "sourceUrl", "imageUrl", choices, "correctChoice"
      FROM questions
      WHERE id = ${questionId}
      LIMIT 1
    `;
    if (!row) return res.status(404).json({ error: "question not found" });

    return res.json({
      item: {
        ...row,
        title: sanitizeQuestionText(row.title),
        statement: sanitizeQuestionText(row.statement),
        solution: sanitizeQuestionText(row.solution),
      },
    });
  } catch (err) {
    console.error("[API] GET /api/admin/questions/:id failed", err);
    return res.status(500).json({ error: "failed to load question" });
  } finally { await sql.end({ timeout: 1 }).catch(() => {}); }
});

// ── DELETE /api/admin/questions/:id ───────────────────────────────────────────
app.delete("/api/admin/questions/:id", async (req: any, res: any) => {
  const sql = getDb();
  if (!sql) return res.status(500).json({ error: "database not configured" });
  try {
    const user = await getSessionUser(req, sql);
    if (!user) return res.status(401).json({ error: "not authenticated" });
    if (user.role !== "admin") return res.status(403).json({ error: "forbidden" });
    await sql`DELETE FROM questions WHERE id = ${Number(req.params.id)}`;
    return res.json({ ok: true });
  } catch (err) {
    console.error("[API] DELETE /api/admin/questions failed", err);
    return res.status(500).json({ error: "failed to delete question" });
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

    const { subjectId, title, statement, solution, year, sourceUrl, imageUrl, choices, correctChoice } = req.body || {};
    if (!subjectId || !title || !statement || !solution) {
      return res.status(400).json({ error: "subjectId, title, statement and solution are required" });
    }

    const normalizedChoices = normalizeAdminChoicesInput(choices);

    const hasChoices = normalizedChoices.length >= 2;
    const safeCorrectChoice = typeof correctChoice === "number" ? correctChoice : null;
    const safeYear = typeof year === "number" ? year : null;

    const [row] = await sql`
      INSERT INTO questions ("subjectId", title, statement, solution, year, "sourceUrl", "imageUrl", choices, "correctChoice")
      VALUES (
        ${Number(subjectId)},
        ${String(title).trim()},
        ${String(statement).trim()},
        ${String(solution).trim()},
        ${safeYear},
        ${sourceUrl || null},
        ${imageUrl || null},
        ${hasChoices ? sql.json(normalizedChoices) : sql`'[]'::jsonb`},
        ${safeCorrectChoice}
      )
      RETURNING id
    `;
    return res.json({ ok: true, id: row.id });
  } catch (err: any) {
    console.error("[API] POST /api/admin/questions failed", err);
    return res.status(500).json({ error: "failed to create question", detail: String(err?.message || err) });
  } finally { await sql.end({ timeout: 1 }).catch(() => {}); }
});

// ── PUT /api/admin/questions/:id ─────────────────────────────────────────────
app.put("/api/admin/questions/:id", async (req: any, res: any) => {
  const sql = getDb();
  if (!sql) return res.status(500).json({ error: "database not configured" });
  try {
    const session = await verifyToken(getCookie(req));
    if (!session) return res.status(401).json({ error: "not authenticated" });
    const [user] = await sql`SELECT role FROM users WHERE "openId" = ${session.openId} LIMIT 1`;
    if (!user || user.role !== "admin") return res.status(403).json({ error: "forbidden" });

    const questionId = Number(req.params.id);
    if (!Number.isFinite(questionId) || questionId <= 0) {
      return res.status(400).json({ error: "invalid question id" });
    }

    const { subjectId, title, statement, solution, year, sourceUrl, imageUrl, choices, correctChoice } = req.body || {};
    if (!subjectId || !title || !statement || !solution) {
      return res.status(400).json({ error: "subjectId, title, statement and solution are required" });
    }

    const normalizedChoices = normalizeAdminChoicesInput(choices);
    const hasChoices = normalizedChoices.length >= 2;
    const safeCorrectChoice = typeof correctChoice === "number" ? correctChoice : null;
    const safeYear = typeof year === "number" ? year : null;

    await sql`
      UPDATE questions
      SET
        "subjectId" = ${Number(subjectId)},
        title = ${String(title).trim()},
        statement = ${String(statement).trim()},
        solution = ${String(solution).trim()},
        year = ${safeYear},
        "sourceUrl" = ${sourceUrl || null},
        "imageUrl" = ${imageUrl || null},
        choices = ${hasChoices ? sql.json(normalizedChoices) : sql`'[]'::jsonb`},
        "correctChoice" = ${safeCorrectChoice},
        "updatedAt" = NOW()
      WHERE id = ${questionId}
    `;

    return res.json({ ok: true, id: questionId });
  } catch (err: any) {
    console.error("[API] PUT /api/admin/questions/:id failed", err);
    return res.status(500).json({ error: "failed to update question", detail: String(err?.message || err) });
  } finally { await sql.end({ timeout: 1 }).catch(() => {}); }
});

// ── POST /api/admin/upload ────────────────────────────────────────────────────
app.post("/api/admin/upload", async (req: any, res: any) => {
  const sql = getDb();
  if (!sql) return res.status(500).json({ error: "database not configured" });
  try {
    // Auth + admin check
    const session = await verifyToken(getCookie(req));
    if (!session) return res.status(401).json({ error: "not authenticated" });
    const [user] = await sql`SELECT role FROM users WHERE "openId" = ${session.openId} LIMIT 1`;
    if (!user || user.role !== "admin") return res.status(403).json({ error: "forbidden" });

    const { data, filename, contentType } = req.body || {};
    if (!data || !filename) return res.status(400).json({ error: "data and filename are required" });

    const { url: supabaseUrl, serviceKey } = getSupabaseConfig();
    if (!supabaseUrl || !serviceKey) {
      return res.status(500).json({ error: "Supabase Storage not configured. Set SUPABASE_SERVICE_ROLE_KEY env var." });
    }

    // Ensure bucket exists
    await ensureBucket(supabaseUrl, serviceKey);

    // Decode base64 → Buffer
    const buffer = Buffer.from(data, "base64");

    // Unique filename to avoid collisions
    const ext = filename.split(".").pop() || "png";
    const uniqueName = `${nanoid()}.${ext}`;

    // Upload to Supabase Storage
    const uploadRes = await fetch(
      `${supabaseUrl}/storage/v1/object/${STORAGE_BUCKET}/${uniqueName}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${serviceKey}`,
          apikey: serviceKey,
          "Content-Type": contentType || "image/png",
        },
        body: buffer,
      }
    );

    if (!uploadRes.ok) {
      const msg = await uploadRes.text().catch(() => "");
      return res.status(500).json({ error: `Upload failed: ${uploadRes.status}`, detail: msg });
    }

    // Public URL
    const publicUrl = `${supabaseUrl}/storage/v1/object/public/${STORAGE_BUCKET}/${uniqueName}`;
    return res.json({ ok: true, url: publicUrl });
  } catch (err: any) {
    console.error("[API] POST /api/admin/upload failed", err);
    return res.status(500).json({ error: "upload failed", detail: String(err?.message || err) });
  } finally { await sql.end({ timeout: 1 }).catch(() => {}); }
});

// ── tRPC placeholder (disabled until import chain issues are resolved) ─────────
app.use("/api/trpc", (_req: any, res: any) => res.status(503).json({ error: "tRPC not available" }));

export default app;
