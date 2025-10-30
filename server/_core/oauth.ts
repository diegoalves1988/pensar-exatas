import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import { ENV } from "./env";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

export function registerOAuthRoutes(app: Express) {
  // Entry point used by the frontend: /app-auth?appId=...&redirectUri=...&state=...&type=signIn
  // If an external OAuth portal is configured (OAUTH_SERVER_URL), forward the request there.
  // Otherwise return a friendly 404 explaining the missing configuration.
  app.get("/app-auth", (req: Request, res: Response) => {
    const { appId, redirectUri, state, type } = req.query as Record<string, string | undefined>;

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

    // No external portal configured. Inform the caller so the developer can configure OAUTH_SERVER_URL.
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
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);

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
