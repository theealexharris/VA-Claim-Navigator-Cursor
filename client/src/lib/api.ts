import type { User, ServiceHistory, MedicalCondition, Claim, LayStatement, BuddyStatement, Document, Appeal } from "@shared/schema";
import { getAccessToken, setAccessToken, removeAccessToken, getAuthHeaders } from "./api-helpers";

// Re-export for convenience
export { getAccessToken, setAccessToken, removeAccessToken };

/** Base URL for API requests. Uses current origin so auth works and URL bar stays correct (e.g. localhost:5000). */
function apiBase(): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  return "";
}

// Helper to get headers with Authorization if token exists
function getHeaders(includeContentType: boolean = true): HeadersInit {
  return getAuthHeaders(includeContentType);
}

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

// Auth API
export async function register(email: string, password: string, firstName?: string, lastName?: string) {
  let res: Response;
  try {
    res = await fetch(`${apiBase()}/api/auth/register`, {
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
        ? "Cannot reach the server. Use http://localhost:5000 in your browser and ensure the dev server is running."
        : "Unable to reach the server. Check your connection and try again."
    );
  }

  const data = await safeJsonParse(res);

  if (!res.ok) {
    const errorMessage = data?.message || data?.error || `Registration failed (${res.status})`;
    throw new Error(errorMessage);
  }

  if (!data) {
    throw new Error("Empty response from server");
  }

  // Email verification required – return the flag so UI can show code entry
  if (data.requireEmailVerification) {
    return { requireEmailVerification: true, email };
  }

  // Immediate login (verification disabled) – store token
  if (data.accessToken) {
    setAccessToken(data.accessToken);
    localStorage.setItem("loginTimestamp", Date.now().toString());
  }
  return data.user || data;
}

export async function login(email: string, password: string) {
  let res: Response;
  try {
    res = await fetch(`${apiBase()}/api/auth/login`, {
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
        ? "Cannot reach the server. Use http://localhost:5000 and ensure the dev server is running."
        : "Unable to reach the server. Check your connection and try again."
    );
  }

  const data = await safeJsonParse(res);

  if (!res.ok) {
    const code = data?.code;
    const errorMessage =
      data?.message ||
      data?.error ||
      (res.status === 401 ? "Invalid email or password." : res.status === 403 ? "Please verify your email to sign in." : "Login failed. Please try again.");
    const err = new Error(errorMessage) as Error & { code?: string };
    if (code === "EMAIL_VERIFICATION_REQUIRED") err.code = code;
    throw err;
  }

  if (!data) {
    throw new Error("Login succeeded but the server response was invalid. Please try again.");
  }

  // Normalize: backend may send { user, accessToken } or nested session
  const token = data.accessToken ?? data.session?.accessToken;
  const user = data.user ?? data.session?.user ?? data;
  if (token) setAccessToken(token);
  // Record login timestamp for session expiry tracking (60-minute window)
  localStorage.setItem("loginTimestamp", Date.now().toString());
  if (user && typeof user === "object") {
    return user;
  }
  throw new Error("Login response was missing user data. Please try again.");
}

export async function verifyEmail(email: string, code: string) {
  let res: Response;
  try {
    res = await fetch(`${apiBase()}/api/auth/verify-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code }),
      credentials: "include",
    });
  } catch (networkErr: any) {
    throw new Error("Cannot reach the server. Use http://localhost:5000 and ensure the dev server is running.");
  }
  const data = await safeJsonParse(res);
  if (!res.ok) {
    throw new Error(data?.message || "Verification failed. Please try again.");
  }
  if (!data) throw new Error("Empty response from server");
  if (data.accessToken) setAccessToken(data.accessToken);
  localStorage.setItem("loginTimestamp", Date.now().toString());
  return data;
}

export async function resendVerificationEmail(email: string): Promise<{ success: boolean; message: string }> {
  const res = await fetch("/api/auth/resend-verification", {
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
  
  const res = await fetch("/api/auth/logout", {
    method: "POST",
    headers,
    credentials: "include",
  });
  
  // Clear token regardless of response
  removeAccessToken();
  
  if (!res.ok) {
    const data = await safeJsonParse(res);
    throw new Error(data?.message || "Logout failed");
  }
  return safeJsonParse(res);
}

export async function getCurrentUser(): Promise<User> {
  let res: Response;
  try {
    res = await fetch("/api/auth/me", {
      headers: getHeaders(false),
      credentials: "include",
    });
  } catch {
    removeAccessToken();
    throw new Error("Not authenticated");
  }

  if (!res.ok) {
    removeAccessToken();
    const data = await safeJsonParse(res);
    throw new Error(data?.message || "Not authenticated");
  }

  const data = await safeJsonParse(res);
  const user = data?.user ?? data;
  if (user && typeof user === "object" && user.id) {
    return user;
  }
  removeAccessToken();
  throw new Error("Not authenticated");
}

// User Profile API - GET returns stored profile from navigator (for dashboard population)
export async function getProfile(): Promise<User | null> {
  const res = await fetch("/api/users/profile", {
    method: "GET",
    headers: getHeaders(false),
    credentials: "include",
  });
  if (!res.ok) {
    if (res.status === 401) removeAccessToken();
    if (res.status === 404) return null;
    throw new Error("Failed to load profile");
  }
  const data = await safeJsonParse(res);
  return data || null;
}

export async function updateProfile(updates: Partial<User>) {
  const res = await fetch("/api/users/profile", {
    method: "PATCH",
    headers: getHeaders(),
    body: JSON.stringify(updates),
    credentials: "include",
  });
  if (!res.ok) {
    if (res.status === 401) removeAccessToken();
    throw new Error("Failed to update profile");
  }
  return res.json();
}

// Service History API
export async function getServiceHistory(): Promise<ServiceHistory[]> {
  const res = await fetch("/api/service-history", { 
    headers: getHeaders(false),
    credentials: "include" 
  });
  if (!res.ok) {
    if (res.status === 401) removeAccessToken();
    throw new Error("Failed to fetch service history");
  }
  return res.json();
}

export async function createServiceHistory(data: Omit<ServiceHistory, "id" | "userId" | "createdAt">) {
  const res = await fetch("/api/service-history", {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(data),
    credentials: "include",
  });
  if (!res.ok) {
    if (res.status === 401) removeAccessToken();
    throw new Error("Failed to create service history");
  }
  return res.json();
}

export async function updateServiceHistory(id: string, updates: Partial<ServiceHistory>) {
  const res = await fetch(`/api/service-history/${id}`, {
    method: "PATCH",
    headers: getHeaders(),
    body: JSON.stringify(updates),
    credentials: "include",
  });
  if (!res.ok) {
    if (res.status === 401) removeAccessToken();
    throw new Error("Failed to update service history");
  }
  return res.json();
}

export async function deleteServiceHistory(id: string) {
  const res = await fetch(`/api/service-history/${id}`, {
    method: "DELETE",
    headers: getHeaders(false),
    credentials: "include",
  });
  if (!res.ok) {
    if (res.status === 401) removeAccessToken();
    throw new Error("Failed to delete service history");
  }
  return res.json();
}

// Medical Conditions API
export async function getMedicalConditions(): Promise<MedicalCondition[]> {
  const res = await fetch("/api/medical-conditions", { 
    headers: getHeaders(false),
    credentials: "include" 
  });
  if (!res.ok) {
    if (res.status === 401) removeAccessToken();
    throw new Error("Failed to fetch medical conditions");
  }
  return res.json();
}

export async function createMedicalCondition(data: Omit<MedicalCondition, "id" | "userId" | "createdAt">) {
  const res = await fetch("/api/medical-conditions", {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(data),
    credentials: "include",
  });
  if (!res.ok) {
    if (res.status === 401) removeAccessToken();
    throw new Error("Failed to create medical condition");
  }
  return res.json();
}

export async function updateMedicalCondition(id: string, updates: Partial<MedicalCondition>) {
  const res = await fetch(`/api/medical-conditions/${id}`, {
    method: "PATCH",
    headers: getHeaders(),
    body: JSON.stringify(updates),
    credentials: "include",
  });
  if (!res.ok) {
    if (res.status === 401) removeAccessToken();
    throw new Error("Failed to update medical condition");
  }
  return res.json();
}

export async function deleteMedicalCondition(id: string) {
  const res = await fetch(`/api/medical-conditions/${id}`, {
    method: "DELETE",
    headers: getHeaders(false),
    credentials: "include",
  });
  if (!res.ok) {
    if (res.status === 401) removeAccessToken();
    throw new Error("Failed to delete medical condition");
  }
  return res.json();
}

// Claims API
export async function getClaims(): Promise<Claim[]> {
  const res = await fetch("/api/claims", { 
    headers: getHeaders(false),
    credentials: "include" 
  });
  if (!res.ok) {
    if (res.status === 401) removeAccessToken();
    throw new Error("Failed to fetch claims");
  }
  return res.json();
}

export async function getClaim(id: string): Promise<Claim> {
  const res = await fetch(`/api/claims/${id}`, { 
    headers: getHeaders(false),
    credentials: "include" 
  });
  if (!res.ok) {
    if (res.status === 401) removeAccessToken();
    throw new Error("Failed to fetch claim");
  }
  return res.json();
}

export async function createClaim(data: Omit<Claim, "id" | "userId" | "createdAt" | "updatedAt">) {
  const res = await fetch("/api/claims", {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(data),
    credentials: "include",
  });
  if (!res.ok) {
    if (res.status === 401) removeAccessToken();
    throw new Error("Failed to create claim");
  }
  return res.json();
}

export async function updateClaim(id: string, updates: Partial<Claim>) {
  const res = await fetch(`/api/claims/${id}`, {
    method: "PATCH",
    headers: getHeaders(),
    body: JSON.stringify(updates),
    credentials: "include",
  });
  if (!res.ok) {
    if (res.status === 401) removeAccessToken();
    throw new Error("Failed to update claim");
  }
  return res.json();
}

export async function deleteClaim(id: string) {
  const res = await fetch(`/api/claims/${id}`, {
    method: "DELETE",
    headers: getHeaders(false),
    credentials: "include",
  });
  if (!res.ok) {
    if (res.status === 401) removeAccessToken();
    throw new Error("Failed to delete claim");
  }
  return res.json();
}

// Lay Statements API
export async function getLayStatements(claimId?: string): Promise<LayStatement[]> {
  const url = claimId ? `/api/lay-statements?claimId=${claimId}` : "/api/lay-statements";
  const res = await fetch(url, { 
    headers: getHeaders(false),
    credentials: "include" 
  });
  if (!res.ok) {
    if (res.status === 401) removeAccessToken();
    throw new Error("Failed to fetch lay statements");
  }
  return res.json();
}

export async function createLayStatement(data: Omit<LayStatement, "id" | "userId" | "createdAt" | "updatedAt">) {
  const res = await fetch("/api/lay-statements", {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(data),
    credentials: "include",
  });
  if (!res.ok) {
    if (res.status === 401) removeAccessToken();
    throw new Error("Failed to create lay statement");
  }
  return res.json();
}

export async function updateLayStatement(id: string, updates: Partial<LayStatement>) {
  const res = await fetch(`/api/lay-statements/${id}`, {
    method: "PATCH",
    headers: getHeaders(),
    body: JSON.stringify(updates),
    credentials: "include",
  });
  if (!res.ok) {
    if (res.status === 401) removeAccessToken();
    throw new Error("Failed to update lay statement");
  }
  return res.json();
}

export async function deleteLayStatement(id: string) {
  const res = await fetch(`/api/lay-statements/${id}`, {
    method: "DELETE",
    headers: getHeaders(false),
    credentials: "include",
  });
  if (!res.ok) {
    if (res.status === 401) removeAccessToken();
    throw new Error("Failed to delete lay statement");
  }
  return res.json();
}

// Buddy Statements API
export async function getBuddyStatements(claimId?: string): Promise<BuddyStatement[]> {
  const url = claimId ? `/api/buddy-statements?claimId=${claimId}` : "/api/buddy-statements";
  const res = await fetch(url, { 
    headers: getHeaders(false),
    credentials: "include" 
  });
  if (!res.ok) {
    if (res.status === 401) removeAccessToken();
    throw new Error("Failed to fetch buddy statements");
  }
  return res.json();
}

export async function createBuddyStatement(data: Omit<BuddyStatement, "id" | "userId" | "createdAt">) {
  const res = await fetch("/api/buddy-statements", {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(data),
    credentials: "include",
  });
  if (!res.ok) {
    if (res.status === 401) removeAccessToken();
    throw new Error("Failed to create buddy statement");
  }
  return res.json();
}

export async function updateBuddyStatement(id: string, updates: Partial<BuddyStatement>) {
  const res = await fetch(`/api/buddy-statements/${id}`, {
    method: "PATCH",
    headers: getHeaders(),
    body: JSON.stringify(updates),
    credentials: "include",
  });
  if (!res.ok) {
    if (res.status === 401) removeAccessToken();
    throw new Error("Failed to update buddy statement");
  }
  return res.json();
}

export async function deleteBuddyStatement(id: string) {
  const res = await fetch(`/api/buddy-statements/${id}`, {
    method: "DELETE",
    headers: getHeaders(false),
    credentials: "include",
  });
  if (!res.ok) {
    if (res.status === 401) removeAccessToken();
    throw new Error("Failed to delete buddy statement");
  }
  return res.json();
}

// Documents API
export async function getDocuments(claimId?: string): Promise<Document[]> {
  const url = claimId ? `/api/documents?claimId=${claimId}` : "/api/documents";
  const res = await fetch(url, { 
    headers: getHeaders(false),
    credentials: "include" 
  });
  if (!res.ok) {
    if (res.status === 401) removeAccessToken();
    throw new Error("Failed to fetch documents");
  }
  return res.json();
}

export async function deleteDocument(id: string) {
  const res = await fetch(`/api/documents/${id}`, {
    method: "DELETE",
    headers: getHeaders(false),
    credentials: "include",
  });
  if (!res.ok) {
    if (res.status === 401) removeAccessToken();
    throw new Error("Failed to delete document");
  }
  return res.json();
}

// Appeals API
export async function getAppeals(): Promise<Appeal[]> {
  const res = await fetch("/api/appeals", { 
    headers: getHeaders(false),
    credentials: "include" 
  });
  if (!res.ok) {
    if (res.status === 401) removeAccessToken();
    throw new Error("Failed to fetch appeals");
  }
  return res.json();
}

export async function getAppeal(id: string): Promise<Appeal> {
  const res = await fetch(`/api/appeals/${id}`, { 
    headers: getHeaders(false),
    credentials: "include" 
  });
  if (!res.ok) {
    if (res.status === 401) removeAccessToken();
    throw new Error("Failed to fetch appeal");
  }
  return res.json();
}

export async function createAppeal(data: Omit<Appeal, "id" | "userId" | "createdAt" | "updatedAt">) {
  const res = await fetch("/api/appeals", {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(data),
    credentials: "include",
  });
  if (!res.ok) {
    if (res.status === 401) removeAccessToken();
    throw new Error("Failed to create appeal");
  }
  return res.json();
}

export async function updateAppeal(id: string, updates: Partial<Appeal>) {
  const res = await fetch(`/api/appeals/${id}`, {
    method: "PATCH",
    headers: getHeaders(),
    body: JSON.stringify(updates),
    credentials: "include",
  });
  if (!res.ok) {
    if (res.status === 401) removeAccessToken();
    throw new Error("Failed to update appeal");
  }
  return res.json();
}

export async function deleteAppeal(id: string) {
  const res = await fetch(`/api/appeals/${id}`, {
    method: "DELETE",
    headers: getHeaders(false),
    credentials: "include",
  });
  if (!res.ok) {
    if (res.status === 401) removeAccessToken();
    throw new Error("Failed to delete appeal");
  }
  return res.json();
}
