import type { VercelRequest, VercelResponse } from "@vercel/node";
import * as db from "../server/db";

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    const items = await db.getAllQuestions();
    res.status(200).json({ items });
  } catch (err) {
    console.error("[Serverless] GET /api/questions failed", err);
    res.status(500).json({ error: "failed to list questions" });
  }
}
