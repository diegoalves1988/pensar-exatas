import postgres from "postgres";

export default async function handler(_req: any, res: any) {
  function send(code: number, body: any) {
    res.statusCode = code;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(body));
  }
  const baseUrl = process.env.DATABASE_URL || "";
  if (!baseUrl) return send(200, { items: [] });
  const url = baseUrl.includes("sslmode=") ? baseUrl : (baseUrl.includes("?") ? `${baseUrl}&sslmode=require` : `${baseUrl}?sslmode=require`);
  let sql: ReturnType<typeof postgres> | null = null;
  try {
    sql = postgres(url, { prepare: false });
    const rows = await sql`select id, name, description, icon, color, "order" from subjects order by "order" asc`;
    return send(200, { items: rows });
  } catch (err) {
    console.error("[Serverless] GET /api/subjects failed", err);
    return send(200, { items: [] });
  } finally {
    try { if (sql) await sql.end({ timeout: 1 }); } catch {}
  }
}
