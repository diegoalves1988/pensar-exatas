import { parse as parseCookieHeader } from "cookie";
import postgres from "postgres";
import { jwtVerify } from "jose";

export default async function handler(req: any, res: any) {
  // Minimal, dependency-light version to avoid runtime issues in serverless
  const cookies = parseCookieHeader(req.headers.cookie || "");
  const token = cookies["app_session_id"] as string | undefined;

  try {
    if (!token) return res.status(200).json(null);

    const secret = process.env.JWT_SECRET || "";
    if (!secret) return res.status(200).json(null);

    // Verify JWT
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), {
      algorithms: ["HS256"],
    });
    const openId = String((payload as any)?.openId || "");
    if (!openId) return res.status(200).json(null);

    // Query user directly
    const baseUrl = process.env.DATABASE_URL || "";
    if (!baseUrl) return res.status(200).json(null);
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
      return res.status(200).json(user ? {
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
    return res.status(200).json(null);
  }
}
