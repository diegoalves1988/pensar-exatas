import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import { SignJWT } from "jose";
import { COOKIE_NAME, ONE_YEAR_MS } from "../../shared/const";

// Force Node runtime on Vercel
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
    console.log("[Serverless][Auth][register-rest] parsed body:", parsed);
    const { name, email, password } = (parsed as any) || {};
    if (!email || !password) return send(res, 400, { error: "email and password are required" });

    const supabaseUrl = process.env.SUPABASE_URL || "";
    const serviceRole = process.env.SUPABASE_SERVICE_ROLE || "";
    if (!supabaseUrl || !serviceRole) {
      console.error("[Serverless][Auth][register-rest] missing SUPABASE_URL or SUPABASE_SERVICE_ROLE");
      return send(res, 500, { error: "server misconfigured: missing SUPABASE_URL or SUPABASE_SERVICE_ROLE" });
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      apikey: serviceRole,
      Authorization: `Bearer ${serviceRole}`,
    };

    // 1) Check existing user by email
    const q = `${supabaseUrl.replace(/\/$/, "")}/rest/v1/users?email=eq.${encodeURIComponent(email)}&select=id,openId,passwordHash`;
    const getRes = await fetch(q, { method: "GET", headers });
    if (!getRes.ok) {
      const txt = await getRes.text();
      console.error("[Serverless][Auth][register-rest] supabase GET failed:", txt);
      return send(res, 500, { error: "failed to query users" });
    }
    const existingRows = await getRes.json();
    const existing = Array.isArray(existingRows) && existingRows[0];

    const passwordHash = await bcrypt.hash(password, 10);

    let openId = existing?.openId;
    if (existing && existing.passwordHash) {
      return send(res, 400, { error: "User already exists" });
    }

    if (existing) {
      // update existing row (set passwordHash and name/loginMethod/lastSignedIn)
      const patchUrl = `${supabaseUrl.replace(/\/$/, "")}/rest/v1/users?id=eq.${encodeURIComponent(existing.id)}`;
      const patchBody = {
        name: name ?? null,
        loginMethod: "email",
        passwordHash,
        lastSignedIn: new Date().toISOString(),
      } as any;
      const patchRes = await fetch(patchUrl, { method: "PATCH", headers: { ...headers, Prefer: "return=representation" }, body: JSON.stringify(patchBody) });
      if (!patchRes.ok) {
        const txt = await patchRes.text();
        console.error("[Serverless][Auth][register-rest] supabase PATCH failed:", txt);
        return send(res, 500, { error: "failed to update user" });
      }
      const upd = await patchRes.json();
      openId = upd?.[0]?.openId ?? openId;
    } else {
      // insert new user
      openId = `local:${nanoid()}`;
      const insertUrl = `${supabaseUrl.replace(/\/$/, "")}/rest/v1/users`;
      const insertBody = [{
        openId,
        name: name ?? null,
        email,
        loginMethod: "email",
        passwordHash,
        role: "user",
        lastSignedIn: new Date().toISOString(),
      }];
      const insertRes = await fetch(insertUrl, { method: "POST", headers: { ...headers, Prefer: "return=representation" }, body: JSON.stringify(insertBody) });
      if (!insertRes.ok) {
        const txt = await insertRes.text();
        console.error("[Serverless][Auth][register-rest] supabase INSERT failed:", txt);
        return send(res, 500, { error: "failed to insert user", details: txt });
      }
      // const inserted = await insertRes.json();
    }

    const jwtSecret = process.env.JWT_SECRET || "";
    if (!jwtSecret) {
      console.error("[Serverless][Auth][register-rest] missing JWT_SECRET env var");
      return send(res, 500, { error: "server misconfigured: missing JWT_SECRET" });
    }

    const sessionToken = await new SignJWT({ openId, appId: process.env.VITE_APP_ID ?? "", name: name ?? "" })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setExpirationTime(Math.floor((Date.now() + ONE_YEAR_MS) / 1000))
      .sign(new TextEncoder().encode(jwtSecret));

    const forwarded = req.headers?.["x-forwarded-proto"];
    const secure = forwarded ? String(forwarded).split(",")[0].trim() === "https" : process.env.NODE_ENV === "production";
    const maxAgeSec = Math.floor(ONE_YEAR_MS / 1000);
    const cookie = `${COOKIE_NAME}=${sessionToken}; Path=/; Max-Age=${maxAgeSec}; HttpOnly; SameSite=None; ${secure ? "Secure" : ""}`;
    res.setHeader("Set-Cookie", cookie);
    console.log("[Serverless][Auth][register-rest] success", { openId });
    return send(res, 200, { ok: true });
  } catch (err) {
    console.error("[Serverless][Auth][register-rest] unexpected error", err);
    const msg = err instanceof Error ? (err.message || String(err)) : String(err);
    return send(res, 500, { error: `register failed: ${msg}` });
  }
}
