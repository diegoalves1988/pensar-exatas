import postgres from "postgres";

export default async function handler(_req: any, res: any) {
  function send(code: number, body: any) {
    res.statusCode = code;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(body));
  }
  // Lightweight query without importing the whole server/db to avoid bundling/runtime issues on Vercel
  const baseUrl = process.env.DATABASE_URL || "";
  if (!baseUrl) return send(200, { items: [] });

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
  return send(200, { items: rows });
  } catch (err) {
    console.error("[Serverless] GET /api/questions failed", err);
    // Be lenient in prod — return empty list instead of failing hard
  return send(200, { items: [] });
  } finally {
    try { if (sql) await sql.end({ timeout: 1 }); } catch {}
  }
}
