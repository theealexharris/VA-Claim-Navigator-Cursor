import type { User, ServiceHistory, MedicalCondition, Claim, LayStatement, BuddyStatement, Document, Appeal } from "@shared/schema";
import {
  getAccessToken, setAccessToken, removeAccessToken,
  setRefreshToken, removeRefreshToken,
  authFetch,
  getApiBase,
  apiUrl
} from "./api-helpers";

// Re-export for convenience
export { getAccessToken, setAccessToken, removeAccessToken, removeRefreshToken, getApiBase, apiUrl };

/**
 * Safely parse JSON from a response, handling empty or invalid JSON
 */
async function safeJsonParse(response: Response): Promise<any> {
  const text = await response.text();
  if (!text || text.trim() === '') {
    return null;
  }
  try {
    return JSON.parse(text);
  } catch (e) {
    console.error('Failed to parse JSON response:', text.substring(0, 200));
    return null;
  }
}

/** Don't show server env/config messages to end users (502/503). Browsers can't read .env; these are backend-only. */
function sanitizeAuthServerMessage(message: string | undefined, status: number): string | undefined {
  if (status !== 502 && status !== 503) return message;
  const m = (message || '').trim();
  if (!m) return undefined;
  if (/INSFORGE|\.env|not configured|restart the server/i.test(m)) {
    return undefined; // caller will use generic fallback
  }
  return m;
}

/** Frontend auth config check before login/register. Use Vite env only (do not check INSFORGE_* in the frontend). */
function assertAuthConfigFromVite(): void {
  const anon = import.meta.env.VITE_INSFORGE_ANON_KEY;
  const base = import.meta.env.VITE_INSFORGE_API_BASE_URL;

  if (!anon || !base) {
    throw new Error(
      "Auth service is not configured correctly. Set VITE_INSFORGE_ANON_KEY and VITE_INSFORGE_API_BASE_URL and redeploy."
    );
  }
}

// Auth API
export async function register(email: string, password: string, firstName?: string, lastName?: string) {
  assertAuthConfigFromVite();
  let res: Response;
  try {
    res = await fetch(apiUrl("/api/auth/register"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, firstName: firstName ?? "", lastName: lastName ?? "" }),
      credentials: "include",
    });
  } catch (networkErr: any) {
    const msg = networkErr?.message ?? "";
    const isFetchFailed = /failed to fetch|fetch failed|networkerror|load failed/i.test(msg);
    throw new Error(
      isFetchFailed
        ? "Cannot reach the server. Use https://vaclaimnavigator.com and ensure the backend is running."
        : "Unable to reach the server. Check your connection and try again."
    );
  }

  const data = await safeJsonParse(res);

  if (!res.ok) {
    const raw = data?.message || data?.error || `Registration failed (${res.status})`;
    const sanitized = sanitizeAuthServerMessage(raw, res.status);
    const errorMessage =
      res.status === 502 || res.status === 503
        ? sanitized ?? "Server or auth service is temporarily unavailable. Please try again later."
        : raw;
    throw new Error(errorMessage);
  }

  if (!data) {
    throw new Error("Empty response from server");
  }

  // Email verification required – return the flag so UI can show code entry
  if (data.requireEmailVerification) {
    return { requireEmailVerification: true, email };
  }

  // Immediate login (verification disabled) – store tokens
  if (data.accessToken) {
    setAccessToken(data.accessToken);
    if (data.refreshToken) setRefreshToken(data.refreshToken);
    localStorage.setItem("loginTimestamp", Date.now().toString());
  }
  return data.user || data;
}

export async function login(email: string, password: string) {
  assertAuthConfigFromVite();
  let res: Response;
  try {
    res = await fetch(apiUrl("/api/auth/login"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      credentials: "include",
    });
  } catch (networkErr: any) {
    const msg = networkErr?.message ?? "";
    const isFetchFailed = /failed to fetch|fetch failed|networkerror|load failed/i.test(msg);
    throw new Error(
      isFetchFailed
        ? "Cannot reach the server. Use the app URL and ensure the backend is running."
        : "Unable to reach the server. Check your connection and try again."
    );
  }

  const data = await safeJsonParse(res);

  if (!res.ok) {
    const code = data?.code;
    const serverMessage = data?.message || data?.error;
    const fallback =
      res.status === 401
        ? "Invalid email or password."
        : res.status === 403
          ? "Please verify your email to sign in."
          : res.status === 502 || res.status === 503
            ? "Server or auth service is temporarily unavailable. Please try again later."
            : "Login failed. Please try again.";
    const sanitized = sanitizeAuthServerMessage(serverMessage, res.status);
    const errorMessage =
      res.status === 502 || res.status === 503
        ? (sanitized && sanitized.trim() ? sanitized.trim() : fallback)
        : (typeof serverMessage === "string" && serverMessage.trim() ? serverMessage.trim() : fallback);
    const err = new Error(errorMessage) as Error & { code?: string };
    if (code === "EMAIL_VERIFICATION_REQUIRED") err.code = code;
    throw err;
  }

  if (!data) {
    throw new Error("Login succeeded but the server response was invalid. Please try again.");
  }

  // Normalize: backend may send { user, accessToken, refreshToken } or nested session
  const token = data.accessToken ?? data.session?.accessToken;
  const rt = data.refreshToken ?? data.session?.refreshToken;
  const user = data.user ?? data.session?.user ?? data;
  if (token) setAccessToken(token);
  if (rt) setRefreshToken(rt);
  // Record login timestamp for session expiry tracking (60-minute window)
  localStorage.setItem("loginTimestamp", Date.now().toString());
  if (user && typeof user === "object") {
    return user;
  }
  throw new Error("Login response was missing user data. Please try again.");
}

export async function verifyEmail(email: string, code: string) {
  assertAuthConfigFromVite();
  let res: Response;
  try {
    res = await fetch(apiUrl("/api/auth/verify-email"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code }),
      credentials: "include",
    });
  } catch (networkErr: any) {
    throw new Error("Cannot reach the server. Ensure the backend is running.");
  }
  const data = await safeJsonParse(res);
  if (!res.ok) {
    throw new Error(data?.message || "Verification failed. Please try again.");
  }
  if (!data) throw new Error("Empty response from server");
  if (data.accessToken) setAccessToken(data.accessToken);
  if (data.refreshToken) setRefreshToken(data.refreshToken);
  localStorage.setItem("loginTimestamp", Date.now().toString());
  return data;
}

export async function resendVerificationEmail(email: string): Promise<{ success: boolean; message: string }> {
  assertAuthConfigFromVite();
  const res = await fetch(apiUrl("/api/auth/resend-verification"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
    credentials: "include",
  });
  const data = await safeJsonParse(res);
  if (!res.ok) {
    throw new Error(data?.message || "Failed to send verification email");
  }
  return data ?? { success: true, message: "Verification email sent." };
}

export async function logout() {
  const token = getAccessToken();
  const headers: HeadersInit = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  
  const res = await fetch(apiUrl("/api/auth/logout"), {
    method: "POST",
    headers,
    credentials: "include",
  });
  
  // Clear both tokens regardless of response
  removeAccessToken();
  removeRefreshToken();
  
  if (!res.ok) {
    const data = await safeJsonParse(res);
    throw new Error(data?.message || "Logout failed");
  }
  return safeJsonParse(res);
}

export async function getCurrentUser(): Promise<User> {
  let res: Response;
  try {
    // authFetch auto-refreshes expired JWT on 401 before giving up
    res = await authFetch("/api/auth/me");
  } catch {
    removeAccessToken();
    removeRefreshToken();
    throw new Error("Not authenticated");
  }

  if (!res.ok) {
    removeAccessToken();
    removeRefreshToken();
    const data = await safeJsonParse(res);
    throw new Error(data?.message || "Not authenticated");
  }

  const data = await safeJsonParse(res);
  const user = data?.user ?? data;
  if (user && typeof user === "object" && user.id) {
    return user;
  }
  removeAccessToken();
  removeRefreshToken();
  throw new Error("Not authenticated");
}

// User Profile API - GET returns stored profile from navigator (for dashboard population)
export async function getProfile(): Promise<User | null> {
  const res = await authFetch("/api/users/profile");
  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error("Failed to load profile");
  }
  const data = await safeJsonParse(res);
  return data || null;
}

export async function updateProfile(updates: Partial<User>) {
  const res = await authFetch("/api/users/profile", {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
  const data = await safeJsonParse(res);
  if (!res.ok) {
    const message = typeof data?.message === "string" && data.message.trim()
      ? data.message.trim()
      : res.status === 404
        ? "User not found. Please log in again."
        : "Failed to save changes. Please try again.";
    throw new Error(message);
  }
  return data;
}

// Service History API
export async function getServiceHistory(): Promise<ServiceHistory[]> {
  const res = await authFetch("/api/service-history");
  if (!res.ok) throw new Error("Failed to fetch service history");
  return res.json();
}

export async function createServiceHistory(data: Omit<ServiceHistory, "id" | "userId" | "createdAt">) {
  const res = await authFetch("/api/service-history", {
    method: "POST",
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create service history");
  return res.json();
}

export async function updateServiceHistory(id: string, updates: Partial<ServiceHistory>) {
  const res = await authFetch(`/api/service-history/${id}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error("Failed to update service history");
  return res.json();
}

export async function deleteServiceHistory(id: string) {
  const res = await authFetch(`/api/service-history/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete service history");
  return res.json();
}

// Medical Conditions API
export async function getMedicalConditions(): Promise<MedicalCondition[]> {
  const res = await authFetch("/api/medical-conditions");
  if (!res.ok) throw new Error("Failed to fetch medical conditions");
  return res.json();
}

export async function createMedicalCondition(data: Omit<MedicalCondition, "id" | "userId" | "createdAt">) {
  const res = await authFetch("/api/medical-conditions", {
    method: "POST",
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create medical condition");
  return res.json();
}

export async function updateMedicalCondition(id: string, updates: Partial<MedicalCondition>) {
  const res = await authFetch(`/api/medical-conditions/${id}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error("Failed to update medical condition");
  return res.json();
}

export async function deleteMedicalCondition(id: string) {
  const res = await authFetch(`/api/medical-conditions/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete medical condition");
  return res.json();
}

// Claims API
export async function getClaims(): Promise<Claim[]> {
  const res = await authFetch("/api/claims");
  if (!res.ok) throw new Error("Failed to fetch claims");
  return res.json();
}

export async function getClaim(id: string): Promise<Claim> {
  const res = await authFetch(`/api/claims/${id}`);
  if (!res.ok) throw new Error("Failed to fetch claim");
  return res.json();
}

export async function createClaim(data: Omit<Claim, "id" | "userId" | "createdAt" | "updatedAt">) {
  const res = await authFetch("/api/claims", {
    method: "POST",
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create claim");
  return res.json();
}

export async function updateClaim(id: string, updates: Partial<Claim>) {
  const res = await authFetch(`/api/claims/${id}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error("Failed to update claim");
  return res.json();
}

export async function deleteClaim(id: string) {
  const res = await authFetch(`/api/claims/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete claim");
  return res.json();
}

// Lay Statements API
export async function getLayStatements(claimId?: string): Promise<LayStatement[]> {
  const url = claimId ? `/api/lay-statements?claimId=${claimId}` : "/api/lay-statements";
  const res = await authFetch(url);
  if (!res.ok) throw new Error("Failed to fetch lay statements");
  return res.json();
}

export async function createLayStatement(data: Omit<LayStatement, "id" | "userId" | "createdAt" | "updatedAt">) {
  const res = await authFetch("/api/lay-statements", {
    method: "POST",
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create lay statement");
  return res.json();
}

export async function updateLayStatement(id: string, updates: Partial<LayStatement>) {
  const res = await authFetch(`/api/lay-statements/${id}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error("Failed to update lay statement");
  return res.json();
}

export async function deleteLayStatement(id: string) {
  const res = await authFetch(`/api/lay-statements/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete lay statement");
  return res.json();
}

// Buddy Statements API
export async function getBuddyStatements(claimId?: string): Promise<BuddyStatement[]> {
  const url = claimId ? `/api/buddy-statements?claimId=${claimId}` : "/api/buddy-statements";
  const res = await authFetch(url);
  if (!res.ok) throw new Error("Failed to fetch buddy statements");
  return res.json();
}

export async function createBuddyStatement(data: Omit<BuddyStatement, "id" | "userId" | "createdAt">) {
  const res = await authFetch("/api/buddy-statements", {
    method: "POST",
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create buddy statement");
  return res.json();
}

export async function updateBuddyStatement(id: string, updates: Partial<BuddyStatement>) {
  const res = await authFetch(`/api/buddy-statements/${id}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error("Failed to update buddy statement");
  return res.json();
}

export async function deleteBuddyStatement(id: string) {
  const res = await authFetch(`/api/buddy-statements/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete buddy statement");
  return res.json();
}

// Documents API
export async function getDocuments(claimId?: string): Promise<Document[]> {
  const url = claimId ? `/api/documents?claimId=${claimId}` : "/api/documents";
  const res = await authFetch(url);
  if (!res.ok) throw new Error("Failed to fetch documents");
  return res.json();
}

export async function deleteDocument(id: string) {
  const res = await authFetch(`/api/documents/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete document");
  return res.json();
}

// Appeals API
export async function getAppeals(): Promise<Appeal[]> {
  const res = await authFetch("/api/appeals");
  if (!res.ok) throw new Error("Failed to fetch appeals");
  return res.json();
}

export async function getAppeal(id: string): Promise<Appeal> {
  const res = await authFetch(`/api/appeals/${id}`);
  if (!res.ok) throw new Error("Failed to fetch appeal");
  return res.json();
}

export async function createAppeal(data: Omit<Appeal, "id" | "userId" | "createdAt" | "updatedAt">) {
  const res = await authFetch("/api/appeals", {
    method: "POST",
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create appeal");
  return res.json();
}

export async function updateAppeal(id: string, updates: Partial<Appeal>) {
  const res = await authFetch(`/api/appeals/${id}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error("Failed to update appeal");
  return res.json();
}

export async function deleteAppeal(id: string) {
  const res = await authFetch(`/api/appeals/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete appeal");
  return res.json();
}
