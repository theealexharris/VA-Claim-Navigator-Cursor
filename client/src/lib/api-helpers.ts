/**
 * Shared API helper functions for Insforge authentication
 * Handles access tokens, refresh tokens, and automatic token refresh on 401.
 */

const ACCESS_TOKEN_KEY = "insforge_access_token";

// ── API Base URL (for production e.g. Vercel frontend → separate backend) ───

/**
 * Base URL for API requests. Always uses same-origin (the Express server serves
 * both the frontend and the API). VITE_API_URL is intentionally NOT used — the
 * Insforge backend URL is only needed server-side (INSFORGE_API_BASE_URL).
 */
export function getApiBase(): string {
  if (typeof window === "undefined") return "";
  return window.location?.origin ?? "";
}

/** Full URL for an API path (e.g. "/api/auth/me" → "https://api.example.com/api/auth/me" or same-origin). */
export function apiUrl(path: string): string {
  const base = getApiBase();
  const p = path.startsWith("/") ? path : `/${path}`;
  return base ? `${base}${p}` : p;
}
const REFRESH_TOKEN_KEY = "insforge_refresh_token";

// ── Access Token ──────────────────────────────────────────────────────────

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function setAccessToken(token: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ACCESS_TOKEN_KEY, token);
}

export function removeAccessToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
}

// ── Refresh Token ─────────────────────────────────────────────────────────

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setRefreshToken(token: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(REFRESH_TOKEN_KEY, token);
}

export function removeRefreshToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

// ── Auth Headers ──────────────────────────────────────────────────────────

/**
 * Get headers with Authorization if token exists
 */
export function getAuthHeaders(includeContentType: boolean = true): HeadersInit {
  const headers: HeadersInit = {};
  if (includeContentType) {
    headers["Content-Type"] = "application/json";
  }
  const token = getAccessToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

// ── Token Refresh ─────────────────────────────────────────────────────────

let refreshInFlight: Promise<boolean> | null = null;

/**
 * Attempt to refresh the access token using the stored refresh token.
 * De-duplicates concurrent refresh calls (only one network request at a time).
 * Returns true if a new access token was obtained, false otherwise.
 */
async function tryRefreshToken(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;

  const rt = getRefreshToken();
  if (!rt) return false;

  refreshInFlight = (async () => {
    try {
      const res = await fetch(apiUrl("/api/auth/refresh"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: rt }),
        credentials: "include",
      });

      if (!res.ok) {
        removeAccessToken();
        removeRefreshToken();
        return false;
      }

      const data = await res.json();
      if (data.accessToken) {
        setAccessToken(data.accessToken);
        if (data.refreshToken) setRefreshToken(data.refreshToken);
        localStorage.setItem("loginTimestamp", Date.now().toString());
        return true;
      }
      return false;
    } catch {
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

// ── authFetch (fetch wrapper with auto-refresh) ───────────────────────────

/**
 * Fetch wrapper that:
 *  1. Automatically includes auth headers
 *  2. On 401 → attempts a transparent token refresh and retries once
 *  3. If still 401 → clears tokens and dispatches "authRequired"
 */
export async function authFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const headers = new Headers(options.headers);

  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const token = getAccessToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const fullUrl = url.startsWith("http") ? url : apiUrl(url);
  let response = await fetch(fullUrl, {
    ...options,
    headers,
    credentials: "include",
  });

  // On 401: try to refresh the token and retry once
  if (response.status === 401 && getRefreshToken()) {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      const retryHeaders = new Headers(options.headers);
      if (options.body && !retryHeaders.has("Content-Type")) {
        retryHeaders.set("Content-Type", "application/json");
      }
      const newToken = getAccessToken();
      if (newToken) {
        retryHeaders.set("Authorization", `Bearer ${newToken}`);
      }
      response = await fetch(fullUrl, {
        ...options,
        headers: retryHeaders,
        credentials: "include",
      });
    }
  }

  // If still 401 after refresh attempt: clear tokens and notify the app
  if (response.status === 401) {
    removeAccessToken();
    removeRefreshToken();
    window.dispatchEvent(new CustomEvent("authRequired", { detail: { from: url } }));
  }

  return response;
}
