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
  if (req.method === "GET") {
    // Could be used too, but we already expose /api/subjects for listing
    try {
      const items = await db.getAllSubjects();
      res.status(200).json({ items });
      return;
    } catch (err) {
      console.error("[Serverless] GET /api/admin/subjects failed", err);
      res.status(500).json({ error: "failed to list subjects" });
      return;
    }
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const admin = await requireAdminFromReq(req);
    if (!admin) {
      res.status(403).json({ error: "forbidden" });
      return;
    }

    const { name, description, icon, color, order } = req.body || {};
    if (!name) {
      res.status(400).json({ error: "name is required" });
      return;
    }

    const result = await db.createSubject({
      name,
      description: description ?? null,
      icon: icon ?? null,
      color: color ?? null,
      order: typeof order === "number" ? order : 0,
    });
    res.status(200).json({ ok: true, result });
  } catch (err) {
    console.error("[Serverless] POST /api/admin/subjects failed", err);
    res.status(500).json({ error: "failed to create subject" });
  }
}
