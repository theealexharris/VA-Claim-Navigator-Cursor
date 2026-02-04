import type { User, ServiceHistory, MedicalCondition, Claim, LayStatement, BuddyStatement, Document, Appeal } from "@shared/schema";

// Auth API
export async function register(email: string, password: string, firstName?: string, lastName?: string) {
  const res = await fetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, firstName, lastName }),
    credentials: "include",
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || "Registration failed");
  }
  return res.json();
}

export async function login(email: string, password: string) {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
    credentials: "include",
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || "Login failed");
  }
  return res.json();
}

export async function logout() {
  const res = await fetch("/api/auth/logout", {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Logout failed");
  return res.json();
}

export async function getCurrentUser(): Promise<User> {
  const res = await fetch("/api/auth/me", { credentials: "include" });
  if (!res.ok) throw new Error("Not authenticated");
  return res.json();
}

// User Profile API
export async function updateProfile(updates: Partial<User>) {
  const res = await fetch("/api/users/profile", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to update profile");
  return res.json();
}

// Service History API
export async function getServiceHistory(): Promise<ServiceHistory[]> {
  const res = await fetch("/api/service-history", { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch service history");
  return res.json();
}

export async function createServiceHistory(data: Omit<ServiceHistory, "id" | "userId" | "createdAt">) {
  const res = await fetch("/api/service-history", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to create service history");
  return res.json();
}

export async function updateServiceHistory(id: string, updates: Partial<ServiceHistory>) {
  const res = await fetch(`/api/service-history/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to update service history");
  return res.json();
}

export async function deleteServiceHistory(id: string) {
  const res = await fetch(`/api/service-history/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to delete service history");
  return res.json();
}

// Medical Conditions API
export async function getMedicalConditions(): Promise<MedicalCondition[]> {
  const res = await fetch("/api/medical-conditions", { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch medical conditions");
  return res.json();
}

export async function createMedicalCondition(data: Omit<MedicalCondition, "id" | "userId" | "createdAt">) {
  const res = await fetch("/api/medical-conditions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to create medical condition");
  return res.json();
}

export async function updateMedicalCondition(id: string, updates: Partial<MedicalCondition>) {
  const res = await fetch(`/api/medical-conditions/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to update medical condition");
  return res.json();
}

export async function deleteMedicalCondition(id: string) {
  const res = await fetch(`/api/medical-conditions/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to delete medical condition");
  return res.json();
}

// Claims API
export async function getClaims(): Promise<Claim[]> {
  const res = await fetch("/api/claims", { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch claims");
  return res.json();
}

export async function getClaim(id: string): Promise<Claim> {
  const res = await fetch(`/api/claims/${id}`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch claim");
  return res.json();
}

export async function createClaim(data: Omit<Claim, "id" | "userId" | "createdAt" | "updatedAt">) {
  const res = await fetch("/api/claims", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to create claim");
  return res.json();
}

export async function updateClaim(id: string, updates: Partial<Claim>) {
  const res = await fetch(`/api/claims/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to update claim");
  return res.json();
}

export async function deleteClaim(id: string) {
  const res = await fetch(`/api/claims/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to delete claim");
  return res.json();
}

// Lay Statements API
export async function getLayStatements(claimId?: string): Promise<LayStatement[]> {
  const url = claimId ? `/api/lay-statements?claimId=${claimId}` : "/api/lay-statements";
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch lay statements");
  return res.json();
}

export async function createLayStatement(data: Omit<LayStatement, "id" | "userId" | "createdAt" | "updatedAt">) {
  const res = await fetch("/api/lay-statements", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to create lay statement");
  return res.json();
}

export async function updateLayStatement(id: string, updates: Partial<LayStatement>) {
  const res = await fetch(`/api/lay-statements/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to update lay statement");
  return res.json();
}

export async function deleteLayStatement(id: string) {
  const res = await fetch(`/api/lay-statements/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to delete lay statement");
  return res.json();
}

// Buddy Statements API
export async function getBuddyStatements(claimId?: string): Promise<BuddyStatement[]> {
  const url = claimId ? `/api/buddy-statements?claimId=${claimId}` : "/api/buddy-statements";
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch buddy statements");
  return res.json();
}

export async function createBuddyStatement(data: Omit<BuddyStatement, "id" | "userId" | "createdAt">) {
  const res = await fetch("/api/buddy-statements", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to create buddy statement");
  return res.json();
}

export async function updateBuddyStatement(id: string, updates: Partial<BuddyStatement>) {
  const res = await fetch(`/api/buddy-statements/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to update buddy statement");
  return res.json();
}

export async function deleteBuddyStatement(id: string) {
  const res = await fetch(`/api/buddy-statements/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to delete buddy statement");
  return res.json();
}

// Documents API
export async function getDocuments(claimId?: string): Promise<Document[]> {
  const url = claimId ? `/api/documents?claimId=${claimId}` : "/api/documents";
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch documents");
  return res.json();
}

export async function deleteDocument(id: string) {
  const res = await fetch(`/api/documents/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to delete document");
  return res.json();
}

// Appeals API
export async function getAppeals(): Promise<Appeal[]> {
  const res = await fetch("/api/appeals", { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch appeals");
  return res.json();
}

export async function getAppeal(id: string): Promise<Appeal> {
  const res = await fetch(`/api/appeals/${id}`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch appeal");
  return res.json();
}

export async function createAppeal(data: Omit<Appeal, "id" | "userId" | "createdAt" | "updatedAt">) {
  const res = await fetch("/api/appeals", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to create appeal");
  return res.json();
}

export async function updateAppeal(id: string, updates: Partial<Appeal>) {
  const res = await fetch(`/api/appeals/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to update appeal");
  return res.json();
}

export async function deleteAppeal(id: string) {
  const res = await fetch(`/api/appeals/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to delete appeal");
  return res.json();
}
