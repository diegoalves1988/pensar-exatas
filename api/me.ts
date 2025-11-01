import type { VercelRequest, VercelResponse } from "@vercel/node";
import { parse as parseCookieHeader } from "cookie";
import { sdk } from "../server/_core/sdk";
import * as db from "../server/db";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const cookies = parseCookieHeader(req.headers.cookie || "");
    const token = cookies["app_session_id"] as string | undefined;
    const session = await sdk.verifySession(token);
    if (!session) {
      res.status(200).json(null);
      return;
    }
    const user = await db.getUserByOpenId(session.openId);
    if (!user) {
      res.status(200).json(null);
      return;
    }
    res.status(200).json({ id: user.id, openId: user.openId, name: user.name, role: user.role, email: user.email });
  } catch (err) {
    console.error("[Serverless] GET /api/me failed", err);
    res.status(500).json({ error: "failed to load me" });
  }
}
