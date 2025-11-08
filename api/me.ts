import { parse as parseCookieHeader } from "cookie";
import postgres from "postgres";
import { jwtVerify } from "jose";

export default async function handler(req: any, res: any) {
  // Minimal, dependency-light version to avoid runtime issues in serverless
  const cookies = parseCookieHeader(req.headers.cookie || "");
  const token = cookies["app_session_id"] as string | undefined;

  function send(code: number, body: any) {
    res.statusCode = code;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(body));
  }

  try {
    if (!token) return send(200, null);

    const secret = process.env.JWT_SECRET || "";
    if (!secret) return send(200, null);

    // Verify JWT
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), {
      algorithms: ["HS256"],
    });
  const openId = String((payload as any)?.openId || "");
  if (!openId) return send(200, null);

    // Query user directly
  const baseUrl = process.env.DATABASE_URL || "";
  if (!baseUrl) return send(200, null);
    const url = baseUrl.includes("sslmode=") ? baseUrl : (baseUrl.includes("?") ? `${baseUrl}&sslmode=require` : `${baseUrl}?sslmode=require`);

    let sql: ReturnType<typeof postgres> | null = null;
    try {
      sql = postgres(url, { prepare: false });
      const rows = await sql`
        select id, "openId", name, role, email
        from users
        where "openId" = ${openId}
        limit 1
      `;
      const user = rows?.[0];
      return send(200, user ? {
        id: user.id,
        openId: user.openId,
        name: user.name,
        role: user.role,
        email: user.email,
      } : null);
    } finally {
      try { if (sql) await sql.end({ timeout: 1 }); } catch {}
    }
  } catch (err) {
    console.error("[Serverless] GET /api/me failed", err);
    // Be lenient: return null instead of 500 to avoid breaking UI
    return send(200, null);
  }
}
