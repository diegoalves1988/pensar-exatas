import bcrypt from "bcryptjs";
import postgres from "postgres";
import { SignJWT } from "jose";
import { COOKIE_NAME, ONE_YEAR_MS } from "../../shared/const";

function send(res: any, code: number, body: any) {
  res.statusCode = code;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

async function readJsonBody(req: any): Promise<any> {
  if (req?.body && typeof req.body === "object") return req.body;
  if (typeof req?.body === "string") { try { return JSON.parse(req.body); } catch { return null; } }
  try {
    const chunks: Buffer[] = [];
    await new Promise<void>((resolve, reject) => {
      req.on("data", (c: Buffer) => chunks.push(Buffer.from(c)));
      req.on("end", () => resolve());
      req.on("error", reject);
    });
    const raw = Buffer.concat(chunks).toString("utf8");
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  } catch { return null; }
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return send(res, 405, { error: "Method not allowed" });

  const parsed = await readJsonBody(req);
  const { email, password } = (parsed as any) || {};
  if (!email || !password) return send(res, 400, { error: "email and password are required" });

  const baseUrl = process.env.DATABASE_URL || "";
  if (!baseUrl) return send(res, 500, { error: "server misconfigured" });
  const url = baseUrl.includes("sslmode=") ? baseUrl : (baseUrl.includes("?") ? `${baseUrl}&sslmode=require` : `${baseUrl}?sslmode=require`);

  let sql: ReturnType<typeof postgres> | null = null;
  try {
    sql = postgres(url, { prepare: false });
    const rows = await sql`select id, "openId", name, "passwordHash" from users where email=${email} limit 1`;
    const user = rows?.[0];
    if (!user || !user.passwordHash) return send(res, 400, { error: "invalid credentials" });

    const ok = await bcrypt.compare(password, String(user.passwordHash));
    if (!ok) return send(res, 400, { error: "invalid credentials" });

    const jwtSecret = process.env.JWT_SECRET || "";
    if (!jwtSecret) return send(res, 500, { error: "server misconfigured" });
    const sessionToken = await new SignJWT({ openId: user.openId, appId: process.env.VITE_APP_ID ?? "", name: user.name || "" })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setExpirationTime(Math.floor((Date.now() + ONE_YEAR_MS) / 1000))
      .sign(new TextEncoder().encode(jwtSecret));

    const forwarded = req.headers["x-forwarded-proto"];
    const secure = forwarded ? String(forwarded).split(",")[0].trim() === "https" : process.env.NODE_ENV === "production";
    const maxAgeSec = Math.floor(ONE_YEAR_MS / 1000);
    const cookie = `${COOKIE_NAME}=${sessionToken}; Path=/; Max-Age=${maxAgeSec}; HttpOnly; SameSite=None; ${secure ? "Secure" : ""}`;
    res.setHeader("Set-Cookie", cookie);
    return send(res, 200, { ok: true });
  } catch (err) {
    console.error("[Serverless][Auth][login]", err);
    return send(res, 500, { error: "login failed" });
  } finally {
    try { if (sql) await sql.end({ timeout: 1 }); } catch {}
  }
}
