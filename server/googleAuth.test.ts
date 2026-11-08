import { createHash } from "node:crypto";
import { createServer } from "node:http";
import app from "../api/index";
import { describe, it, expect, beforeAll } from "vitest";
import { SignJWT, generateKeyPair, exportJWK, createLocalJWKSet } from "jose";
import { googleConfig, createGoogleAttempt, verifyGoogleAttempt, verifyGoogleIdentity } from "../api/index";

const config = googleConfig({ GOOGLE_CLIENT_ID: "test-client", GOOGLE_CLIENT_SECRET: "test-only", APP_URL: "https://example.com", JWT_SECRET: "a".repeat(48) })!;
let privateKey: CryptoKey;
let keys: ReturnType<typeof createLocalJWKSet>;
beforeAll(async () => {
  const pair = await generateKeyPair("RS256");
  privateKey = pair.privateKey;
  keys = createLocalJWKSet({ keys: [{ ...await exportJWK(pair.publicKey), kid: "test", alg: "RS256" }] });
});
async function token(overrides: Record<string, unknown> = {}, audience = config.clientId, expiry = "5m") {
  return new SignJWT({ nonce: "nonce", email: "Student@example.com", email_verified: true, ...overrides })
    .setProtectedHeader({ alg: "RS256", kid: "test" }).setIssuer("https://accounts.google.com")
    .setAudience(audience).setSubject("google-user-1").setIssuedAt().setExpirationTime(expiry).sign(privateKey);
}
describe("Google authentication", () => {
  it("stays unavailable without credentials or HTTPS canonical origin", () => {
    expect(googleConfig({})).toBeNull();
    expect(googleConfig({ GOOGLE_CLIENT_ID: "x", GOOGLE_CLIENT_SECRET: "x", JWT_SECRET: "a".repeat(48), APP_URL: "http://example.com" })).toBeNull();
  });
  it("binds the signed browser attempt to state and includes PKCE", async () => {
    const attempt = await createGoogleAttempt(config);
    const url = new URL(attempt.url);
    const result = await verifyGoogleAttempt(attempt.cookie, url.searchParams.get("state"), config);
    expect(result.nonce).toBe(url.searchParams.get("nonce"));
    expect(result.verifier.length).toBeGreaterThanOrEqual(43);
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    expect(url.searchParams.get("redirect_uri")).toBe("https://example.com/api/auth/google/callback");
    await expect(verifyGoogleAttempt(undefined, url.searchParams.get("state"), config)).rejects.toThrow();
    await expect(verifyGoogleAttempt(attempt.cookie, "x".repeat(43), config)).rejects.toThrow();
    await expect(verifyGoogleAttempt(attempt.cookie + "broken", url.searchParams.get("state"), config)).rejects.toThrow();
  });
  it("rejects an expired login attempt", async () => {
    const cookie = await new SignJWT({ state: "x".repeat(43), nonce: "n", verifier: "v" })
      .setProtectedHeader({ alg: "HS256" }).setIssuer("pensar-exatas").setAudience("google-login")
      .setIssuedAt().setExpirationTime("0s").sign(config.secret);
    await expect(verifyGoogleAttempt(cookie, "x".repeat(43), config)).rejects.toThrow();
  });
  it("identifies the account by Google's subject, not its email", async () => {
    const identity = await verifyGoogleIdentity(await token(), "nonce", config, keys);
    expect(identity.openId).toBe("google:" + createHash("sha256").update("google-user-1").digest("base64url"));
    expect(identity.openId.length).toBeLessThanOrEqual(64);
    expect(identity.email).toBe("student@example.com");
  });
  it("rejects a different client, expired token, unverified email and wrong nonce", async () => {
    await expect(verifyGoogleIdentity(await token({}, "other-client"), "nonce", config, keys)).rejects.toThrow();
    await expect(verifyGoogleIdentity(await token({}, config.clientId, "0s"), "nonce", config, keys)).rejects.toThrow();
    await expect(verifyGoogleIdentity(await token({ email_verified: false }), "nonce", config, keys)).rejects.toThrow();
    await expect(verifyGoogleIdentity(await token(), "different", config, keys)).rejects.toThrow();
    await expect(verifyGoogleIdentity(await token({ azp: "other-client" }), "nonce", config, keys)).rejects.toThrow();
  });
});

describe("Vercel authentication endpoints", () => {
  it("boots the real API and keeps Google unavailable until configured", async () => {
    const server = createServer(app);
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address() as { port: number };
    const base = "http://127.0.0.1:" + address.port;
    try {
      expect((await fetch(base + "/api/health")).status).toBe(200);
      const providers = await fetch(base + "/api/auth/providers");
      expect(await providers.json()).toEqual({ google: false });
      const start = await fetch(base + "/api/auth/google", { redirect: "manual" });
      expect(start.status).toBe(303);
      expect(start.headers.get("location")).toBe("/login?google_error=unavailable");
      const callback = await fetch(base + "/api/auth/google/callback?code=fake&state=fake", { redirect: "manual" });
      expect(callback.status).toBe(303);
      expect(callback.headers.get("set-cookie")).not.toContain("app_session_id");
    } finally {
      server.closeAllConnections();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});
