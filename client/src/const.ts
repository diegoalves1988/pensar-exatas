export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

export const APP_TITLE = import.meta.env.VITE_APP_TITLE || "Domine as Exatas no Enem";

export const APP_LOGO =
  import.meta.env.VITE_APP_LOGO ||
  "/logo.svg";

// sessionStorage key for the cached profile summary (questionsResolved, points, streaks…)
export const PROFILE_SUMMARY_CACHE_KEY = "profile-summary-cache-v1";

// Generate login URL at runtime so redirect URI reflects the current origin.
export const getLoginUrl = () => {
  const oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL;
  const appId = import.meta.env.VITE_APP_ID;
  const redirectUri = `${window.location.origin}/api/oauth/callback`;
  const state = btoa(redirectUri);
  // oauthPortalUrl may be undefined in some deployments (or not set in Vercel).
  // Construct a safe URL: prefer the configured external portal, otherwise
  // fall back to a path on the current origin to avoid throwing
  // "Failed to construct 'URL': Invalid URL" in the browser.
  const base = typeof oauthPortalUrl === "string" && oauthPortalUrl.trim() !== ""
    ? oauthPortalUrl
    : window.location.origin;

  const url = new URL(`${base.replace(/\/$/, "")}/app-auth`);
  // Avoid inserting undefined into query params — normalize to empty string
  url.searchParams.set("appId", appId ?? "");
  url.searchParams.set("redirectUri", redirectUri ?? "");
  url.searchParams.set("state", state ?? "");
  url.searchParams.set("type", "signIn");

  return url.toString();
};

// Generate register URL (uses type=signUp) so the portal can present a sign-up flow.
export const getRegisterUrl = () => {
  const oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL;
  const appId = import.meta.env.VITE_APP_ID;
  const redirectUri = `${window.location.origin}/api/oauth/callback`;
  const state = btoa(redirectUri);

  const base = typeof oauthPortalUrl === "string" && oauthPortalUrl.trim() !== ""
    ? oauthPortalUrl
    : window.location.origin;

  const url = new URL(`${base.replace(/\/$/, "")}/app-auth`);
  url.searchParams.set("appId", appId ?? "");
  url.searchParams.set("redirectUri", redirectUri ?? "");
  url.searchParams.set("state", state ?? "");
  url.searchParams.set("type", "signUp");

  return url.toString();
};