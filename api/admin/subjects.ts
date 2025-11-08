import { parse as parseCookieHeader } from "cookie";
import * as db from "../../server/db";
import { sdk } from "../../server/_core/sdk";

async function requireAdminFromReq(req: any) {
  const cookies = parseCookieHeader(req.headers.cookie || "");
  const token = cookies["app_session_id"];
  const session = await sdk.verifySession(token);
  if (!session) return null;
  const user = await db.getUserByOpenId(session.openId);
  if (!user || user.role !== "admin") return null;
  return user;
}

export default async function handler(req: any, res: any) {
  function send(code: number, body: any) {
    res.statusCode = code;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(body));
  }
  if (req.method === "GET") {
    // Could be used too, but we already expose /api/subjects for listing
    try {
      const items = await db.getAllSubjects();
      return send(200, { items });
    } catch (err) {
      console.error("[Serverless] GET /api/admin/subjects failed", err);
      return send(500, { error: "failed to list subjects" });
    }
  }

  if (req.method !== "POST") return send(405, { error: "Method not allowed" });

  try {
    const admin = await requireAdminFromReq(req);
    if (!admin) return send(403, { error: "forbidden" });

    const { name, description, icon, color, order } = req.body || {};
    if (!name) return send(400, { error: "name is required" });

    const result = await db.createSubject({
      name,
      description: description ?? null,
      icon: icon ?? null,
      color: color ?? null,
      order: typeof order === "number" ? order : 0,
    });
    return send(200, { ok: true, result });
  } catch (err) {
    console.error("[Serverless] POST /api/admin/subjects failed", err);
    return send(500, { error: "failed to create subject" });
  }
}
