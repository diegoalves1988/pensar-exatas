// Lightweight diagnostic endpoint for register-rest: does not import heavy libs.
export const config = { runtime: "nodejs18.x" } as const;

function send(res: any, code: number, body: any) {
  res.statusCode = code;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

export default async function handler(req: any, res: any) {
  try {
    res.setHeader("Content-Type", "application/json");
    if (req.method !== "POST") return send(res, 405, { error: "Method not allowed" });

    const supabaseUrl = process.env.SUPABASE_URL || null;
    const serviceRole = process.env.SUPABASE_SERVICE_ROLE || null;
    const jwtSecret = process.env.JWT_SECRET || null;

    const info: any = { env: { hasSupabaseUrl: !!supabaseUrl, hasServiceRole: !!serviceRole, hasJwtSecret: !!jwtSecret } };

    if (!supabaseUrl || !serviceRole) return send(res, 200, { info, note: "missing supabase envs" });

    const headers: Record<string, string> = { apikey: serviceRole, Authorization: `Bearer ${serviceRole}` };
    const url = `${supabaseUrl.replace(/\/$/, "")}/rest/v1/users?select=id&limit=1`;
    const r = await fetch(url, { method: "GET", headers });
    info.supabase = { status: r.status, ok: r.ok };
    try { info.body = await r.text(); } catch (e) { info.body = String(e); }

    return send(res, 200, info);
  } catch (err) {
    console.error("[Serverless][Auth][register-rest-dbg]", err);
    return send(res, 500, { error: String(err) });
  }
}
