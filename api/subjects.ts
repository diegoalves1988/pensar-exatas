import postgres from "postgres";

export default async function handler(_req: any, res: any) {
  const baseUrl = process.env.DATABASE_URL || "";
  if (!baseUrl) return res.status(200).json({ items: [] });
  const url = baseUrl.includes("sslmode=") ? baseUrl : (baseUrl.includes("?") ? `${baseUrl}&sslmode=require` : `${baseUrl}?sslmode=require`);
  let sql: ReturnType<typeof postgres> | null = null;
  try {
    sql = postgres(url, { prepare: false });
    const rows = await sql`select id, name, description, icon, color, "order" from subjects order by "order" asc`;
    return res.status(200).json({ items: rows });
  } catch (err) {
    console.error("[Serverless] GET /api/subjects failed", err);
    return res.status(200).json({ items: [] });
  } finally {
    try { if (sql) await sql.end({ timeout: 1 }); } catch {}
  }
}
