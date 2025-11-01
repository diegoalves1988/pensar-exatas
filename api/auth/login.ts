import type { VercelRequest, VercelResponse } from "@vercel/node";
import bcrypt from "bcryptjs";
import * as db from "../../server/db";
import { sdk } from "../../server/_core/sdk";
import { COOKIE_NAME, ONE_YEAR_MS } from "../../shared/const";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      res.status(400).json({ error: "email and password are required" });
      return;
    }

    const user = await db.getUserByEmail(email);
    if (!user || !user.passwordHash) {
      res.status(400).json({ error: "invalid credentials" });
      return;
    }

    const ok = await bcrypt.compare(password, String(user.passwordHash));
    if (!ok) {
      res.status(400).json({ error: "invalid credentials" });
      return;
    }

    const sessionToken = await sdk.createSessionToken(user.openId, { name: user.name || "", expiresInMs: ONE_YEAR_MS });

    const forwarded = req.headers["x-forwarded-proto"];
    const secure = forwarded ? String(forwarded).split(",")[0].trim() === "https" : process.env.NODE_ENV === "production";

    const maxAgeSec = Math.floor(ONE_YEAR_MS / 1000);
    const cookie = `${COOKIE_NAME}=${sessionToken}; Path=/; Max-Age=${maxAgeSec}; HttpOnly; SameSite=None; ${
      secure ? "Secure" : ""
    }`;

    res.setHeader("Set-Cookie", cookie);
    res.json({ ok: true });
  } catch (err) {
    console.error("[Serverless][Auth][login]", err);
    res.status(500).json({ error: "login failed" });
  }
}
