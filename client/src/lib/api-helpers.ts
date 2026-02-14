/**
 * Shared API helper functions for Insforge authentication
 */

const ACCESS_TOKEN_KEY = "insforge_access_token";

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

/**
 * Fetch wrapper that automatically includes auth headers and handles 401
 */
export async function authFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const headers = new Headers(options.headers);
  
  // Add Content-Type if body exists and not already set
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  
  // Add Authorization header if token exists
  const token = getAccessToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  
  const response = await fetch(url, {
    ...options,
    headers,
    credentials: "include",
  });

  // On 401: clear token and notify app so user can re-login without losing claim/evidence data
  if (response.status === 401) {
    removeAccessToken();
    window.dispatchEvent(new CustomEvent("authRequired", { detail: { from: url } }));
  }

  return response;
}
