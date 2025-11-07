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

    const { subjectId, title, statement, solution, difficulty, year, sourceUrl } = req.body || {};
    if (!subjectId || !title || !statement || !solution) {
      res.status(400).json({ error: "subjectId, title, statement, solution are required" });
      return;
    }

    const result = await db.createQuestion({
      subjectId: Number(subjectId),
      title,
      statement,
      solution,
      difficulty: difficulty ?? null,
      year: typeof year === "number" ? year : null,
      sourceUrl: sourceUrl ?? null,
    });
    res.status(200).json({ ok: true, result });
  } catch (err) {
    console.error("[Serverless] POST /api/admin/questions failed", err);
    res.status(500).json({ error: "failed to create question" });
  }
}
