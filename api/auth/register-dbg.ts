// Lightweight debug endpoint to verify serverless execution and request parsing in production.
// Does NOT write to the database. Returns parsed body, headers, and env var presence.

export const config = { runtime: "nodejs18.x" } as const;

function send(res: any, code: number, body: any) {
  res.statusCode = code;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

async function readJsonBody(req: any): Promise<any> {
  try {
    if (req?.body && typeof req.body === "object") return req.body;
    if (typeof req?.body === "string") { try { return JSON.parse(req.body); } catch { /* ignore */ } }
    if (typeof req?.json === "function") return await req.json();
    if (typeof req?.text === "function") {
      const t = await req.text();
      try { return JSON.parse(t); } catch { return t; }
    }
    if (typeof req?.on === "function") {
      const chunks: Uint8Array[] = [];
      await new Promise<void>((resolve, reject) => {
        req.on("data", (c: Uint8Array) => chunks.push(c instanceof Uint8Array ? c : Uint8Array.from(c)));
        req.on("end", () => resolve());
        req.on("error", reject);
      });
      const raw = Buffer?.from ? Buffer.from(Buffer.concat(chunks as any)).toString("utf8") : new TextDecoder().decode(chunks[0] || new Uint8Array());
      if (!raw) return null;
      try { return JSON.parse(raw); } catch { return raw; }
    }
  } catch (err) {
    // fallthrough
  }
  return null;
}

export default async function handler(req: any, res: any) {
  try {
    res.setHeader("Content-Type", "application/json");
    if (req.method !== "POST") return send(res, 405, { error: "Method not allowed" });

    const parsed = await readJsonBody(req);
    console.log("[Serverless][Auth][register-dbg] parsed body:", parsed);

    const info = {
      parsedBody: parsed,
      headers: req.headers || {},
      env: {
        hasDatabaseUrl: !!process.env.DATABASE_URL,
        hasJwtSecret: !!process.env.JWT_SECRET,
        viteAppId: process.env.VITE_APP_ID || null,
        nodeEnv: process.env.NODE_ENV || null,
      },
    };

    return send(res, 200, info);
  } catch (err) {
    console.error("[Serverless][Auth][register-dbg] error", err);
    return send(res, 500, { error: "debug failed", details: String(err) });
  }
}
