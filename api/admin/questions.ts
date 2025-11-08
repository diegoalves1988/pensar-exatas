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

  if (req.method !== "POST") return send(405, { error: "Method not allowed" });

  try {
    const admin = await requireAdminFromReq(req);
    if (!admin) return send(403, { error: "forbidden" });

    const { subjectId, title, statement, solution, difficulty, year, sourceUrl } = req.body || {};
    if (!subjectId || !title || !statement || !solution) return send(400, { error: "subjectId, title, statement, solution are required" });

    const result = await db.createQuestion({
      subjectId: Number(subjectId),
      title,
      statement,
      solution,
      difficulty: difficulty ?? null,
      year: typeof year === "number" ? year : null,
      sourceUrl: sourceUrl ?? null,
    });
    return send(200, { ok: true, result });
  } catch (err) {
    console.error("[Serverless] POST /api/admin/questions failed", err);
    return send(500, { error: "failed to create question" });
  }
}
