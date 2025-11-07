import bcrypt from "bcryptjs";
import postgres from "postgres";
import { SignJWT } from "jose";
import { COOKIE_NAME, ONE_YEAR_MS } from "../../shared/const";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { email, password } = (req.body as any) || {};
  if (!email || !password) {
    return res.status(400).json({ error: "email and password are required" });
  }

  const baseUrl = process.env.DATABASE_URL || "";
  if (!baseUrl) return res.status(500).json({ error: "server misconfigured" });
  const url = baseUrl.includes("sslmode=") ? baseUrl : (baseUrl.includes("?") ? `${baseUrl}&sslmode=require` : `${baseUrl}?sslmode=require`);

  let sql: ReturnType<typeof postgres> | null = null;
  try {
    sql = postgres(url, { prepare: false });
    const rows = await sql`select id, "openId", name, "passwordHash" from users where email=${email} limit 1`;
    const user = rows?.[0];
    if (!user || !user.passwordHash) return res.status(400).json({ error: "invalid credentials" });

    const ok = await bcrypt.compare(password, String(user.passwordHash));
    if (!ok) return res.status(400).json({ error: "invalid credentials" });

    const jwtSecret = process.env.JWT_SECRET || "";
    if (!jwtSecret) return res.status(500).json({ error: "server misconfigured" });
    const sessionToken = await new SignJWT({ openId: user.openId, appId: process.env.VITE_APP_ID ?? "", name: user.name || "" })
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
    console.error("[Serverless][Auth][login]", err);
    return res.status(500).json({ error: "login failed" });
  } finally {
    try { if (sql) await sql.end({ timeout: 1 }); } catch {}
  }
}
