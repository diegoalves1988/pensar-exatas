import { sdk } from "./sdk";
import * as db from "../db";

async function requireAdmin(req: any) {
  const user = await sdk.authenticateRequest(req);
  if (!user || user.role !== "admin") {
    const err: any = new Error("Forbidden");
    err.status = 403;
    throw err;
  }
  return user;
}

export function registerAdminRoutes(app: any) {
  // Auth: who am I
  app.get("/api/me", async (req: any, res: any) => {
    try {
      const user = await sdk.authenticateRequest(req);
      res.json({ id: user.id, openId: user.openId, name: user.name, role: user.role, email: user.email });
    } catch {
      res.json(null);
    }
  });

  // Public: list subjects
  app.get("/api/subjects", async (_req: any, res: any) => {
    try {
      const subjects = await db.getAllSubjects();
      res.json({ items: subjects });
    } catch (err) {
      console.error("[Admin] GET /api/subjects failed", err);
      res.status(500).json({ error: "failed to list subjects" });
    }
  });

  // Admin: create subject
  app.post("/api/admin/subjects", async (req: any, res: any) => {
    try {
      await requireAdmin(req);
      const { name, description, icon, color, order } = req.body || {};
      if (!name) return res.status(400).json({ error: "name is required" });
      const result = await db.createSubject({
        name,
        description: description ?? null,
        icon: icon ?? null,
        color: color ?? null,
        order: typeof order === "number" ? order : 0,
      });
      res.json({ ok: true, result });
    } catch (err: any) {
      const status = err?.status === 403 ? 403 : 500;
      console.error("[Admin] POST /api/admin/subjects failed", err);
      res.status(status).json({ error: status === 403 ? "forbidden" : "failed to create subject" });
    }
  });

  // Admin: create question
  app.post("/api/admin/questions", async (req: any, res: any) => {
    try {
      await requireAdmin(req);
      const { subjectId, title, statement, solution, difficulty, year, sourceUrl, choices, correctChoice } = req.body || {};
      if (!subjectId || !title || !statement || !solution) {
        return res.status(400).json({ error: "subjectId, title, statement, solution are required" });
      }
      const result = await db.createQuestion({
        subjectId: Number(subjectId),
        title,
        statement,
        solution,
        difficulty: difficulty ?? null,
        year: typeof year === "number" ? year : null,
        sourceUrl: sourceUrl ?? null,
        choices: Array.isArray(choices) ? choices : null,
        correctChoice: typeof correctChoice === "number" ? correctChoice : null,
      });
      res.json({ ok: true, result });
    } catch (err: any) {
      const status = err?.status === 403 ? 403 : 500;
      console.error("[Admin] POST /api/admin/questions failed", err);
      res.status(status).json({ error: status === 403 ? "forbidden" : "failed to create question" });
    }
  });
}
