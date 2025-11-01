import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import { ENV } from "./env";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

export function registerOAuthRoutes(app: Express) {
  // Email/password registration endpoint (same-domain option)
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const { name, email, password } = req.body || {};
      if (!email || !password) {
        res.status(400).json({ error: "email and password are required" });
        return;
      }

      // Check if user already exists
      const existing = await db.getUserByEmail(email);
      if (existing && existing.passwordHash) {
        res.status(400).json({ error: "User already exists" });
        return;
      }

      // Create openId and hash password
      const openId = existing?.openId ?? `local:${nanoid()}`;
      const passwordHash = await bcrypt.hash(password, 10);

      await db.upsertUser({
        openId,
        name: name ?? null,
        email,
        loginMethod: "email",
        passwordHash,
        lastSignedIn: new Date(),
      } as any);

      // create session token and set cookie
      const sessionToken = await sdk.createSessionToken(openId, { name: name ?? "", expiresInMs: ONE_YEAR_MS });
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      res.json({ ok: true });
    } catch (err) {
      console.error("[Auth] register failed", err);
      res.status(500).json({ error: "register failed" });
    }
  });

  // Email/password login endpoint
  app.post("/api/auth/login", async (req: Request, res: Response) => {
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
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      res.json({ ok: true });
    } catch (err) {
      console.error("[Auth] login failed", err);
      res.status(500).json({ error: "login failed" });
    }
  });

  // Entry point used by the frontend: /app-auth?appId=...&redirectUri=...&state=...&type=signIn
  // If an external OAuth portal is configured (OAUTH_SERVER_URL), forward the request there.
  // Otherwise return a friendly 404 explaining the missing configuration.
  app.get("/app-auth", (req: Request, res: Response) => {
    const { appId, redirectUri, state, type } = req.query as Record<string, string | undefined>;

    // If an external OAuth portal is configured, forward to it.
    if (ENV.oAuthServerUrl && ENV.oAuthServerUrl.trim() !== "") {
      const base = ENV.oAuthServerUrl.replace(/\/$/, "");
      const url = `${base}/app-auth?${new URLSearchParams({
        appId: appId ?? "",
        redirectUri: redirectUri ?? "",
        state: state ?? "",
        type: type ?? "",
      }).toString()}`;

      // Redirect the browser to the external portal which will start the OAuth flow.
      res.redirect(302, url);
      return;
    }

    // If no external portal is configured, provide a helpful dev fallback in non-production.
    if (process.env.NODE_ENV !== "production") {
      // If a redirectUri was provided, simulate a portal by redirecting back with a dev code.
      if (redirectUri && typeof redirectUri === "string") {
        const devCode = "dev"; // magic code recognized by the callback in dev
        const redirect = `${redirectUri}${redirectUri.includes("?") ? "&" : "?"}code=${encodeURIComponent(
          devCode
        )}&state=${encodeURIComponent(state ?? "")}`;
        res.redirect(302, redirect);
        return;
      }

      res.status(400).send(
        `No redirectUri provided and no OAuth portal configured. For local testing, open /app-auth?redirectUri=...`
      );
      return;
    }

    // Production: No external portal configured. Inform the caller so the developer can configure OAUTH_SERVER_URL.
    res.status(404).send(
      `No OAuth portal configured. Set the OAUTH_SERVER_URL environment variable to a valid OAuth portal that supports /app-auth. Received params: appId=${appId}, redirectUri=${redirectUri}`
    );
  });

  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");

    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    try {
      // Development shortcut: if the portal returned the special dev code, create a dev session
      // without calling the external OAuth server.
      let userInfo;
      if (process.env.NODE_ENV !== "production" && code === "dev") {
        userInfo = {
          openId: "dev-user-1",
          name: "Developer",
          email: "dev@example.test",
          platform: "email",
          loginMethod: "email",
        } as any;
      } else {
        const tokenResponse = await sdk.exchangeCodeForToken(code, state);
        userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
      }

      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }

      await db.upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: new Date(),
      });

      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      res.redirect(302, "/");
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
}
