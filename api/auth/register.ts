import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import postgres from "postgres";
import { SignJWT } from "jose";
import { COOKIE_NAME, ONE_YEAR_MS } from "../../shared/const";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { name, email, password } = (req.body as any) || {};
  if (!email || !password) {
    return res.status(400).json({ error: "email and password are required" });
  }

  // DB connection (force sslmode=require)
  const baseUrl = process.env.DATABASE_URL || "";
  if (!baseUrl) return res.status(500).json({ error: "server misconfigured" });
  const url = baseUrl.includes("sslmode=") ? baseUrl : (baseUrl.includes("?") ? `${baseUrl}&sslmode=require` : `${baseUrl}?sslmode=require`);

  let sql: ReturnType<typeof postgres> | null = null;
  try {
    sql = postgres(url, { prepare: false });

    const existingRows = await sql`
      select id, "openId", "passwordHash" from users where email = ${email} limit 1
    `;
    const existing = existingRows?.[0];

    if (existing && existing.passwordHash) {
      return res.status(400).json({ error: "User already exists" });
    }

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
    if (!jwtSecret) return res.status(500).json({ error: "server misconfigured" });

    const sessionToken = await new SignJWT({ openId, appId: process.env.VITE_APP_ID ?? "", name: name ?? "" })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setExpirationTime(Math.floor((Date.now() + ONE_YEAR_MS) / 1000))
      .sign(new TextEncoder().encode(jwtSecret));

    const forwarded = req.headers["x-forwarded-proto"];
    const secure = forwarded ? String(forwarded).split(",")[0].trim() === "https" : process.env.NODE_ENV === "production";
    const maxAgeSec = Math.floor(ONE_YEAR_MS / 1000);
    const cookie = `${COOKIE_NAME}=${sessionToken}; Path=/; Max-Age=${maxAgeSec}; HttpOnly; SameSite=None; ${secure ? "Secure" : ""}`;
    res.setHeader("Set-Cookie", cookie);
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("[Serverless][Auth][register]", err);
    return res.status(500).json({ error: "register failed" });
  } finally {
    try { if (sql) await sql.end({ timeout: 1 }); } catch {}
  }
}
