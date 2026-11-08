import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { SignJWT, jwtVerify, createRemoteJWKSet, type JWTVerifyGetKey } from "jose";

export const GOOGLE_COOKIE = "__Host-google-login";
export const GOOGLE_COOKIE_OPTIONS = { httpOnly: true, secure: true, sameSite: "lax" as const, path: "/" };
const googleKeys = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));
export type GoogleConfig = { clientId: string; clientSecret: string; secret: Uint8Array; origin: string; redirectUri: string };

export function googleConfig(env: Record<string, string | undefined>): GoogleConfig | null {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !env.APP_URL || !env.JWT_SECRET || env.JWT_SECRET.length < 32) return null;
  try {
    const url = new URL(env.APP_URL);
    if (url.protocol !== "https:" || url.username || url.password || url.pathname !== "/" || url.search || url.hash) return null;
    return { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET, secret: new TextEncoder().encode(env.JWT_SECRET), origin: url.origin, redirectUri: url.origin + "/api/auth/google/callback" };
  } catch { return null; }
}

export async function createGoogleAttempt(config: GoogleConfig) {
  const state = randomBytes(32).toString("base64url");
  const nonce = randomBytes(32).toString("base64url");
  const verifier = randomBytes(32).toString("base64url");
  const cookie = await new SignJWT({ state, nonce, verifier })
    .setProtectedHeader({ alg: "HS256" }).setIssuer("pensar-exatas").setAudience("google-login")
    .setIssuedAt().setExpirationTime("10m").sign(config.secret);
  const params = new URLSearchParams({
    client_id: config.clientId, redirect_uri: config.redirectUri, response_type: "code",
    scope: "openid email profile", state, nonce, prompt: "select_account",
    code_challenge: createHash("sha256").update(verifier).digest("base64url"),
    code_challenge_method: "S256",
  });
  return { cookie, url: "https://accounts.google.com/o/oauth2/v2/auth?" + params };
}

export async function verifyGoogleAttempt(cookie: string | undefined, state: unknown, config: GoogleConfig) {
  if (!cookie || typeof state !== "string" || state.length !== 43) throw new Error("invalid_state");
  const { payload } = await jwtVerify(cookie, config.secret, {
    algorithms: ["HS256"], issuer: "pensar-exatas", audience: "google-login", requiredClaims: ["exp", "iat"],
  });
  if (typeof payload.state !== "string" || payload.state.length !== state.length ||
      !timingSafeEqual(Buffer.from(payload.state), Buffer.from(state)) ||
      typeof payload.nonce !== "string" || typeof payload.verifier !== "string") throw new Error("invalid_state");
  return { nonce: payload.nonce, verifier: payload.verifier };
}

export async function verifyGoogleIdentity(idToken: string, nonce: string, config: GoogleConfig, keys: JWTVerifyGetKey = googleKeys) {
  const { payload } = await jwtVerify(idToken, keys, {
    algorithms: ["RS256"], issuer: ["https://accounts.google.com", "accounts.google.com"],
    audience: config.clientId, requiredClaims: ["exp", "iat", "sub", "nonce", "email", "email_verified"],
  });
  if (payload.nonce !== nonce || payload.email_verified !== true ||
      typeof payload.sub !== "string" || !payload.sub || payload.sub.length > 255 ||
      typeof payload.email !== "string" || payload.email.length > 320 ||
      (payload.azp !== undefined && payload.azp !== config.clientId)) throw new Error("invalid_identity");
  return { openId: "google:" + createHash("sha256").update(payload.sub).digest("base64url"), email: payload.email.toLowerCase(), name: typeof payload.name === "string" ? payload.name.slice(0, 200) : "" };
}

export async function exchangeGoogleCode(code: string, verifier: string, config: GoogleConfig) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ code, client_id: config.clientId, client_secret: config.clientSecret,
      redirect_uri: config.redirectUri, grant_type: "authorization_code", code_verifier: verifier }),
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error("token_exchange_failed");
  const tokens = await response.json();
  if (typeof tokens.id_token !== "string") throw new Error("missing_id_token");
  return tokens.id_token as string;
}
