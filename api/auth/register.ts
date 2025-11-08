import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import postgres from "postgres";
import { SignJWT } from "jose";
import { COOKIE_NAME, ONE_YEAR_MS } from "../../shared/const";

// Force Node runtime on Vercel
export const config = { runtime: "nodejs18.x" } as const;

function send(res: any, code: number, body: any) {
  res.statusCode = code;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

async function readJsonBody(req: any): Promise<any> {
  try {
    // 1) Already-parsed body (Node frameworks)
    if (req?.body && typeof req.body === "object") return req.body;
    if (typeof req?.body === "string") { try { return JSON.parse(req.body); } catch { /* ignore */ } }

    // 2) Edge/Web Request style
    if (typeof req?.json === "function") {
      return await req.json();
    }
    if (typeof req?.text === "function") {
      const t = await req.text();
      try { return JSON.parse(t); } catch { return null; }
    }

    // 3) Node IncomingMessage stream
    if (typeof req?.on === "function") {
      const chunks: Uint8Array[] = [];
      await new Promise<void>((resolve, reject) => {
        req.on("data", (c: Uint8Array) => chunks.push(c instanceof Uint8Array ? c : Uint8Array.from(c)));
        req.on("end", () => resolve());
        req.on("error", reject);
      });
      const raw = Buffer?.from ? Buffer.from(Buffer.concat(chunks as any)).toString("utf8") : new TextDecoder().decode(chunks[0] || new Uint8Array());
      if (!raw) return null;
      try { return JSON.parse(raw); } catch { return null; }
    }
  } catch {
    // fallthrough
  }
  return null;
}

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== "POST") return send(res, 405, { error: "Method not allowed" });

    const parsed = await readJsonBody(req);
    const { name, email, password } = (parsed as any) || {};
    if (!email || !password) return send(res, 400, { error: "email and password are required" });

    // DB connection (force sslmode=require)
    const baseUrl = process.env.DATABASE_URL || "";
    if (!baseUrl) return send(res, 500, { error: "server misconfigured" });
    const url = baseUrl.includes("sslmode=") ? baseUrl : (baseUrl.includes("?") ? `${baseUrl}&sslmode=require` : `${baseUrl}?sslmode=require`);

    let sql: ReturnType<typeof postgres> | null = null;
    try {
      sql = postgres(url, { prepare: false });

      const existingRows = await sql`
        select id, "openId", "passwordHash" from users where email = ${email} limit 1
      `;
      const existing = existingRows?.[0];

      if (existing && existing.passwordHash) return send(res, 400, { error: "User already exists" });

      const openId = existing?.openId ?? `local:${nanoid()}`;
      const passwordHash = await bcrypt.hash(password, 10);

      if (existing) {
        await sql`
          update users
          set name = ${name ?? null}, "loginMethod" = 'email', "passwordHash" = ${passwordHash}, "lastSignedIn" = now()
          where id = ${existing.id}
        `;
      } else {
        await sql`
          insert into users ("openId", name, email, "loginMethod", "passwordHash", role, "lastSignedIn")
          values (${openId}, ${name ?? null}, ${email}, 'email', ${passwordHash}, 'user', now())
        `;
      }

      const jwtSecret = process.env.JWT_SECRET || "";
      if (!jwtSecret) return send(res, 500, { error: "server misconfigured" });

      const sessionToken = await new SignJWT({ openId, appId: process.env.VITE_APP_ID ?? "", name: name ?? "" })
        .setProtectedHeader({ alg: "HS256", typ: "JWT" })
        .setExpirationTime(Math.floor((Date.now() + ONE_YEAR_MS) / 1000))
        .sign(new TextEncoder().encode(jwtSecret));

      const forwarded = req.headers?.["x-forwarded-proto"];
      const secure = forwarded ? String(forwarded).split(",")[0].trim() === "https" : process.env.NODE_ENV === "production";
      const maxAgeSec = Math.floor(ONE_YEAR_MS / 1000);
      const cookie = `${COOKIE_NAME}=${sessionToken}; Path=/; Max-Age=${maxAgeSec}; HttpOnly; SameSite=None; ${secure ? "Secure" : ""}`;
      res.setHeader("Set-Cookie", cookie);
      return send(res, 200, { ok: true });
    } finally {
      try { if (sql) await sql.end({ timeout: 1 }); } catch {}
    }
  } catch (err) {
    console.error("[Serverless][Auth][register]", err);
    return send(res, 500, { error: "register failed" });
  }
}
