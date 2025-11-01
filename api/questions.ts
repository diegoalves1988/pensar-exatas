import type { VercelRequest, VercelResponse } from "@vercel/node";
import postgres from "postgres";

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  // Lightweight query without importing the whole server/db to avoid bundling/runtime issues on Vercel
  const baseUrl = process.env.DATABASE_URL || "";
  if (!baseUrl) {
    // Return empty instead of 500 to keep UI functional
    return res.status(200).json({ items: [] });
  }

  // Ensure sslmode=require for Supabase, if missing
  const url = baseUrl.includes("sslmode=") ? baseUrl : (baseUrl.includes("?") ? `${baseUrl}&sslmode=require` : `${baseUrl}?sslmode=require`);

  let sql: ReturnType<typeof postgres> | null = null;
  try {
    sql = postgres(url, { prepare: false });
    const rows = await sql`
      select id, "subjectId", title, statement, solution, difficulty, year, "sourceUrl"
      from questions
      order by id desc
      limit 1000
    `;
    return res.status(200).json({ items: rows });
  } catch (err) {
    console.error("[Serverless] GET /api/questions failed", err);
    // Be lenient in prod — return empty list instead of failing hard
    return res.status(200).json({ items: [] });
  } finally {
    try { if (sql) await sql.end({ timeout: 1 }); } catch {}
  }
}
