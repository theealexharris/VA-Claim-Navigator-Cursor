import type { Express } from "express";
import { createServer, type Server } from "http";
import { InsforgeStorageService } from "./insforge-storage-service";
import { isInsforgeAnonKeyConfigured } from "./insforge";
import { 
  registerUser, 
  signInUser, 
  signOutUser,
  requireInsforgeAuth,
  optionalInsforgeAuth,
  getInsforgeSession,
  refreshAccessToken,
  verifyEmailDirect 
} from "./insforge-auth";
import { insforgeStorage } from "./insforge-storage";
import { z } from "zod";
import { insertUserSchema, insertServiceHistorySchema, insertMedicalConditionSchema, insertClaimSchema, insertLayStatementSchema, insertBuddyStatementSchema, insertAppealSchema, insertReferralSchema, insertConsultationSchema, type User } from "@shared/schema";
import { getFeatureResearch, getConditionGuidance, generateLayStatementDraft, generateBuddyStatementTemplate, generateClaimMemorandum, analyzeMedicalRecords, type FeatureType, type ClaimMemorandumData } from "./ai-service";
import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";
import { TEMP_UPLOAD_DIR } from "./constants";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Create Insforge storage service instance
  const storage = new InsforgeStorageService();

  // Map DB user (snake_case) to API/frontend shape (camelCase)
  function dbUserToApiUser(dbUser: any): any {
    if (!dbUser) return dbUser;
    return {
      id: dbUser.id,
      email: dbUser.email,
      firstName: dbUser.first_name,
      lastName: dbUser.last_name,
      phone: dbUser.phone,
      address: dbUser.address,
      city: dbUser.city,
      state: dbUser.state,
      zipCode: dbUser.zip_code,
      avatarUrl: dbUser.avatar_url,
      vaId: dbUser.va_id,
      ssn: dbUser.ssn ?? undefined,
      vaFileNumber: dbUser.va_file_number ?? undefined,
      subscriptionTier: dbUser.subscription_tier,
      role: dbUser.role,
      twoFactorEnabled: dbUser.two_factor_enabled,
      profileCompleted: dbUser.profile_completed,
      stripeCustomerId: dbUser.stripe_customer_id,
      stripeSubscriptionId: dbUser.stripe_subscription_id,
      createdAt: dbUser.created_at,
    };
  }

  // Map API/frontend updates (camelCase) to DB columns (snake_case)
  function apiUpdatesToDbUpdates(updates: Record<string, any>): Record<string, any> {
    const map: Record<string, string> = {
      firstName: "first_name", lastName: "last_name", zipCode: "zip_code",
      avatarUrl: "avatar_url", vaId: "va_id", ssn: "ssn", vaFileNumber: "va_file_number",
      subscriptionTier: "subscription_tier",
      twoFactorEnabled: "two_factor_enabled", profileCompleted: "profile_completed",
      stripeCustomerId: "stripe_customer_id", stripeSubscriptionId: "stripe_subscription_id",
      createdAt: "created_at",
    };
    const db: Record<string, any> = {};
    for (const [k, v] of Object.entries(updates)) {
      if (v === undefined) continue;
      db[map[k] ?? k] = v;
    }
    return db;
  }

  // Auth config check – use same validation as insforge client (trimmed key, no placeholder)
  function getAuthConfigError(): string | null {
    if (!isInsforgeAnonKeyConfigured()) {
      return "Auth is not configured. Add INSFORGE_ANON_KEY to your .env (get it from your Insforge project dashboard) and restart the server.";
    }
    const base = (process.env.INSFORGE_API_BASE_URL || "").trim();
    if (base && /your-insforge|placeholder/i.test(base)) {
      return "Auth URL is not configured. Set INSFORGE_API_BASE_URL in .env to your Insforge backend URL.";
    }
    return null;
  }

  app.get("/api/auth/status", (_req, res) => {
    const err = getAuthConfigError();
    res.json({ authConfigured: !err, error: err ?? undefined });
  });

  // Auth routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const configErr = getAuthConfigError();
      if (configErr) {
        console.warn("[REGISTER] Blocked – auth not configured");
        return res.status(503).json({ message: configErr });
      }

      if (!req.body || typeof req.body !== "object") {
        return res.status(400).json({ message: "Invalid request body" });
      }
      const body = req.body as Record<string, unknown>;
      const email = typeof body.email === "string" ? body.email.trim() : "";
      const password = typeof body.password === "string" ? body.password : "";
      const firstName = typeof body.firstName === "string" ? body.firstName.trim() : "";
      const lastName = typeof body.lastName === "string" ? body.lastName.trim() : "";

      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }
      if (!password) {
        return res.status(400).json({ message: "Password is required" });
      }
      if (password.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
      }

      const fullName = `${firstName} ${lastName}`.trim() || undefined;

      console.log(`[REGISTER] Attempting registration for: ${email}`);
      
      const result = await registerUser(email, password, fullName);
      
      console.log(`[REGISTER] Insforge response received`);
      
      // Handle null/undefined result
      if (!result) {
        console.error('[REGISTER] Insforge returned null/undefined result');
        return res.status(500).json({ message: "Registration service unavailable. Please try again." });
      }
      
      // Handle email verification required
      if (result.requireEmailVerification) {
        console.log(`[REGISTER] Email verification required for: ${email}`);
        return res.json({ 
          message: "Please check your email to verify your account",
          requireEmailVerification: true 
        });
      }
      
      // Validate that we got user data back
      if (!result.user) {
        console.error('[REGISTER] No user in Insforge response');
        return res.status(500).json({ message: "Registration incomplete. Please try again." });
      }

      // Save user to navigator database so profile exists for dashboard and future requests
      let dbUser: any = null;
      if (result.accessToken) {
        try {
          const authUser = result.user as any;
          const userRow = {
            id: authUser.id,
            email: authUser.email || email,
            password: "", // Auth is handled by Insforge; placeholder for DB NOT NULL
            first_name: firstName ?? authUser.firstName ?? (authUser.profile?.name || "").split(" ")[0] ?? "",
            last_name: lastName ?? authUser.lastName ?? (authUser.profile?.name || "").split(" ").slice(1).join(" ") ?? "",
          };
          dbUser = await storage.createUser(userRow, result.accessToken);
          console.log(`[REGISTER] User saved to navigator: ${authUser.id}`);
        } catch (createErr: any) {
          // User row may already exist (e.g. from a previous flow)
          if (createErr?.message?.includes("duplicate") || createErr?.message?.includes("unique") || createErr?.code === "23505") {
            dbUser = await storage.getUser(result.user.id, result.accessToken);
          } else {
            console.error("[REGISTER] Failed to save user to navigator:", createErr?.message);
          }
        }
      }
      
      // Increment stats (if we have an access token)
      if (result.accessToken) {
        try {
          await storage.incrementStat("vets_served", result.accessToken);
        } catch (statError) {
          console.error('[REGISTER] Failed to increment stats:', statError);
          // Don't fail registration for stats error
        }
      }
      
      console.log(`[REGISTER] Success for: ${email}`);
      
      // Return stored profile so dashboard can be populated from navigator data
      const apiUser = dbUser ? dbUserToApiUser(dbUser) : { id: result.user.id, email: result.user.email, firstName: firstName ?? "", lastName: lastName ?? "" };
      const regPayload: { user: any; accessToken?: string; refreshToken?: string } = { user: apiUser };
      if (result.accessToken) regPayload.accessToken = result.accessToken;
      if (result.refreshToken) regPayload.refreshToken = result.refreshToken;
      res.json(regPayload);
    } catch (error: any) {
      const errorMessage = String(error?.message || "Registration failed");
      console.error("[REGISTER] Error:", errorMessage);

      if (errorMessage.toLowerCase().includes("already") || errorMessage.toLowerCase().includes("exists")) {
        return res.status(409).json({ message: "An account with this email already exists." });
      }
      if (errorMessage.toLowerCase().includes("password")) {
        return res.status(400).json({ message: errorMessage });
      }
      // Config / key errors – tell user exactly what to fix
      if (/anon|api key|unauthorized|401|invalid key|invalid api|config/i.test(errorMessage.toLowerCase())) {
        return res.status(503).json({
          message: "Auth is not configured correctly. Set INSFORGE_ANON_KEY in .env (from your Insforge dashboard). Restart the dev server after changing .env.",
        });
      }
      // Network/connectivity – include config hint so it's not a dead end
      if (/network|fetch|econnrefused|timeout|unreachable/i.test(errorMessage.toLowerCase())) {
        return res.status(503).json({
          message: "Cannot reach the auth service. Check your internet connection and that INSFORGE_ANON_KEY and INSFORGE_API_BASE_URL in .env are correct. Restart the server after editing .env.",
        });
      }

      res.status(400).json({ message: errorMessage });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const configErr = getAuthConfigError();
      if (configErr) {
        console.warn("[LOGIN] Blocked – auth not configured");
        return res.status(503).json({ message: configErr });
      }

      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      console.log(`[LOGIN] Attempting login for: ${email}`);
      
      const result = await signInUser(email, password);
      
      if (!result?.user) {
        console.error('[LOGIN] No user in Insforge response');
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Ensure user exists in navigator DB; never fail login if DB ops fail (auth already succeeded)
      let dbUser: any = null;
      try {
        dbUser = result.accessToken
          ? await storage.getUser(result.user.id, result.accessToken)
          : null;
        if (!dbUser && result.accessToken) {
          try {
            const authUser = result.user as any;
            const nameParts = (authUser.profile?.name || authUser.name || "").trim().split(/\s+/);
            const userRow = {
              id: authUser.id,
              email: authUser.email || email,
              password: "",
              first_name: nameParts[0] ?? "",
              last_name: nameParts.slice(1).join(" ") ?? "",
            };
            dbUser = await storage.createUser(userRow, result.accessToken);
            console.log(`[LOGIN] User saved to navigator: ${authUser.id}`);
          } catch (createErr: any) {
            if (createErr?.message?.includes("duplicate") || createErr?.message?.includes("unique") || createErr?.code === "23505") {
              dbUser = await storage.getUser(result.user.id, result.accessToken);
            } else {
              console.warn('[LOGIN] Could not create user row (login still succeeds):', createErr?.message);
            }
          }
        }
      } catch (dbErr: any) {
        console.warn('[LOGIN] DB lookup/create failed (login still succeeds):', dbErr?.message);
      }

      const apiUser = dbUser ? dbUserToApiUser(dbUser) : result.user;
      const payload: { user: any; accessToken?: string; refreshToken?: string } = { user: apiUser };
      if (result.accessToken) payload.accessToken = result.accessToken;
      if (result.refreshToken) payload.refreshToken = result.refreshToken;

      console.log(`[LOGIN] Success for: ${email}`);
      res.json(payload);
    } catch (error: any) {
      const msg = String(error?.message || "").toLowerCase();
      const statusCode = error?.statusCode ?? 0;
      console.error("[LOGIN] Error:", error?.message, "| statusCode:", statusCode, "| errorCode:", error?.errorCode);
      if (res.headersSent) return;

      // Actual invalid credentials from Insforge → 401 (must check BEFORE the config catch-all)
      const errorCode = String(error?.errorCode || "").toLowerCase();
      if (
        statusCode === 401 && (errorCode === "auth_unauthorized" || /invalid credentials/i.test(msg))
      ) {
        const safeMsg = /verify|verification|email.*confirm/i.test(msg)
          ? "Please verify your email before signing in. Check your inbox for the verification link or code."
          : "Invalid email or password. If you recently signed up, make sure you've verified your email first.";
        return res.status(401).json({ message: safeMsg });
      }

      // Config / key / auth service unreachable → 503 with clear message
      if (
        statusCode === 401 && /invalid token|invalid key|anon|api key/i.test(errorCode)
        || /anon|api key|invalid key|invalid api|config|invalid token/i.test(msg)
      ) {
        return res.status(503).json({
          message: "Auth service is not configured correctly. Set INSFORGE_ANON_KEY and INSFORGE_API_BASE_URL in .env and restart the server.",
        });
      }
      if (/network|fetch|econnrefused|enotfound|timeout|econnrefused/i.test(msg)) {
        return res.status(503).json({
          message: "Cannot reach the auth service. Check INSFORGE_API_BASE_URL in .env and that the Insforge backend is reachable.",
        });
      }

      // Invalid credentials or unverified email → 401 with user-facing message
      const safeMessage =
        statusCode === 403 || /verify|verification|email.*confirm/i.test(msg)
          ? "Please verify your email before signing in. Check your inbox for the verification link or code."
          : "Invalid email or password. If you recently signed up, make sure you've verified your email first.";
      return res.status(401).json({ message: safeMessage });
    }
  });

  app.post("/api/auth/verify-email", async (req, res) => {
    try {
      const { email, code } = req.body;
      if (!email || !code) {
        return res.status(400).json({ message: "Email and verification code are required" });
      }
      const data = await verifyEmailDirect(email.trim(), String(code).trim());

      if (!data || !data.user) {
        return res.status(400).json({ message: "Verification failed. Please try again." });
      }

      // Verification succeeded – user is now logged in; save to navigator DB
      const authUser = data.user as any;
      let dbUser: any = null;
      if (data.accessToken && authUser) {
        try {
          dbUser = await storage.getUser(authUser.id, data.accessToken);
          if (!dbUser) {
            const nameParts = (authUser.profile?.name || authUser.name || "").trim().split(/\s+/);
            dbUser = await storage.createUser({
              id: authUser.id,
              email: authUser.email || email,
              password: "",
              first_name: nameParts[0] ?? "",
              last_name: nameParts.slice(1).join(" ") ?? "",
            }, data.accessToken);
          }
        } catch (dbErr: any) {
          console.warn("[VERIFY] DB save failed (verification still succeeded):", dbErr?.message);
        }
        try { await storage.incrementStat("vets_served", data.accessToken); } catch (_) {}
      }

      const apiUser = dbUser ? dbUserToApiUser(dbUser) : (authUser ?? { email });
      const verifyPayload: { user: any; accessToken?: string | null; refreshToken?: string | null } = { user: apiUser, accessToken: data.accessToken };
      if (data.refreshToken) verifyPayload.refreshToken = data.refreshToken;
      res.json(verifyPayload);
    } catch (error: any) {
      if (!res.headersSent) {
        const msg = error?.message || "Verification failed";
        const isExpired = /expired|invalid/i.test(msg);
        res.status(isExpired ? 400 : 500).json({ message: msg });
      }
    }
  });

  // Token refresh – client sends its refreshToken to get a new accessToken + refreshToken
  app.post("/api/auth/refresh", async (req, res) => {
    try {
      const { refreshToken } = req.body ?? {};
      if (!refreshToken || typeof refreshToken !== "string") {
        return res.status(400).json({ message: "refreshToken is required" });
      }

      const result = await refreshAccessToken(refreshToken.trim());

      if (!result?.accessToken) {
        return res.status(401).json({ message: "Token refresh failed. Please sign in again." });
      }

      res.json({
        accessToken: result.accessToken,
        refreshToken: result.refreshToken ?? null,
        user: result.user ?? null,
      });
    } catch (error: any) {
      console.error("[REFRESH] Error:", error?.message);
      if (!res.headersSent) {
        res.status(401).json({ message: "Session expired. Please sign in again." });
      }
    }
  });

  app.post("/api/auth/resend-verification", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email || typeof email !== "string") {
        return res.status(400).json({ message: "Email is required" });
      }
      const { resendVerificationEmail: resendVerification } = await import("./insforge-auth");
      await resendVerification(email.trim());
      res.json({ success: true, message: "If an account exists, a new verification code has been sent." });
    } catch (error: any) {
      console.error("[resend-verification] Insforge error:", error?.message || error, error?.errorCode || "");
      if (!res.headersSent) {
        // Still return success to prevent user enumeration
        res.json({ success: true, message: "If an account exists, a new verification code has been sent." });
      }
    }
  });

  app.post("/api/auth/logout", async (req, res) => {
    try {
      const session = await getInsforgeSession(req);
      if (session) {
        await signOutUser(session.accessToken);
      }
      res.json({ message: "Logged out successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/auth/me", requireInsforgeAuth(), async (req, res) => {
    const session = (req as any).insforgeSession;
    // Return stored navigator profile so dashboard is populated from DB
    const dbUser = await storage.getUser(session.user.id, session.accessToken);
    const user = dbUser ? dbUserToApiUser(dbUser) : session.user;
    res.json({ user });
  });

  // User profile routes - GET returns stored profile for dashboard population
  app.get("/api/users/profile", requireInsforgeAuth(), async (req, res) => {
    try {
      const session = (req as any).insforgeSession;
      const dbUser = await storage.getUser(session.user.id, session.accessToken);
      if (!dbUser) {
        return res.status(404).json({ message: "Profile not found" });
      }
      res.json(dbUserToApiUser(dbUser));
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/users/profile", requireInsforgeAuth(), async (req, res) => {
    try {
      const session = (req as any).insforgeSession;
      const user = session.user;
      const updates = { ...req.body };
      
      // Don't allow changing password or email through this endpoint
      delete updates.password;
      delete updates.email;
      
      // Check if this is the first time saving profile (for counter)
      const dbUser = await storage.getUser(user.id, session.accessToken);
      const profileCompleted = dbUser?.profile_completed ?? user.profileCompleted ?? user.profile?.profileCompleted ?? false;
      const isFirstProfileSave = !profileCompleted && 
        (updates.firstName || updates.lastName || updates.phone || updates.address);
      
      if (isFirstProfileSave) {
        updates.profileCompleted = true;
      }
      
      const dbUpdates = apiUpdatesToDbUpdates(updates);
      const updatedUser = await storage.updateUser(user.id, dbUpdates, session.accessToken);
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Increment vets served counter on first profile save
      if (isFirstProfileSave) {
        await storage.incrementStat("vets_served", session.accessToken);
      }
      
      res.json(dbUserToApiUser(updatedUser));
    } catch (error: any) {
      const msg = String(error?.message || "Failed to save profile.").trim();
      console.error("[PROFILE PATCH] Error:", msg);
      if (!res.headersSent) res.status(500).json({ message: msg || "Failed to save changes. Please try again." });
    }
  });

  // Service History routes
  app.get("/api/service-history", requireInsforgeAuth(), async (req, res) => {
    try {
      const session = (req as any).insforgeSession;
      const history = await storage.getServiceHistory(session.user.id, session.accessToken);
      // Convert snake_case DB rows to camelCase for the frontend
      const mapped = (history || []).map((row: any) => ({
        id: row.id,
        userId: row.user_id ?? row.userId,
        branch: row.branch,
        component: row.component,
        dateEntered: row.date_entered ?? row.dateEntered,
        dateSeparated: row.date_separated ?? row.dateSeparated,
        mos: row.mos,
        deployments: row.deployments,
        createdAt: row.created_at ?? row.createdAt,
      }));
      res.json(mapped);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/service-history", requireInsforgeAuth(), async (req, res) => {
    try {
      const session = (req as any).insforgeSession;
      const body = {
        ...req.body,
        userId: session.user.id,
        dateEntered: req.body.dateEntered ? new Date(req.body.dateEntered) : undefined,
        dateSeparated: req.body.dateSeparated ? new Date(req.body.dateSeparated) : null,
      };
      const data = insertServiceHistorySchema.parse(body);
      // Convert camelCase schema output to snake_case DB columns
      const dbRow: Record<string, any> = {
        user_id: data.userId,
        branch: data.branch,
        component: data.component,
        date_entered: data.dateEntered instanceof Date ? data.dateEntered.toISOString() : data.dateEntered,
        date_separated: data.dateSeparated instanceof Date ? data.dateSeparated.toISOString() : data.dateSeparated ?? null,
        mos: data.mos ?? null,
        deployments: data.deployments ?? null,
      };
      const history = await storage.createServiceHistory(dbRow, session.accessToken);
      res.json(history);
    } catch (error: any) {
      console.error("[SERVICE-HISTORY POST] Error:", error.message);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/service-history/:id", requireInsforgeAuth(), async (req, res) => {
    try {
      const session = (req as any).insforgeSession;
      const existing = await storage.getServiceHistoryById(req.params.id, session.accessToken);
      if (!existing || (existing.user_id ?? existing.userId) !== session.user.id) {
        return res.status(404).json({ message: "Service history not found" });
      }
      // Convert camelCase updates to snake_case
      const dbUpdates: Record<string, any> = {};
      if (req.body.branch !== undefined) dbUpdates.branch = req.body.branch;
      if (req.body.component !== undefined) dbUpdates.component = req.body.component;
      if (req.body.dateEntered !== undefined) dbUpdates.date_entered = new Date(req.body.dateEntered).toISOString();
      if (req.body.dateSeparated !== undefined) dbUpdates.date_separated = req.body.dateSeparated ? new Date(req.body.dateSeparated).toISOString() : null;
      if (req.body.mos !== undefined) dbUpdates.mos = req.body.mos;
      if (req.body.deployments !== undefined) dbUpdates.deployments = req.body.deployments;
      const updated = await storage.updateServiceHistory(req.params.id, dbUpdates, session.accessToken);
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/service-history/:id", requireInsforgeAuth(), async (req, res) => {
    try {
      const session = (req as any).insforgeSession;
      const existing = await storage.getServiceHistoryById(req.params.id, session.accessToken);
      if (!existing || (existing.user_id ?? existing.userId) !== session.user.id) {
        return res.status(404).json({ message: "Service history not found" });
      }
      await storage.deleteServiceHistory(req.params.id, session.accessToken);
      res.json({ message: "Deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Medical Conditions routes
  app.get("/api/medical-conditions", requireInsforgeAuth(), async (req, res) => {
    try {
      const session = (req as any).insforgeSession;
      const conditions = await storage.getMedicalConditions(session.user.id, session.accessToken);
      // Convert snake_case DB rows to camelCase for the frontend
      const mapped = (conditions || []).map((row: any) => ({
        id: row.id,
        userId: row.user_id ?? row.userId,
        conditionName: row.condition_name ?? row.conditionName,
        diagnosedDate: row.diagnosed_date ?? row.diagnosedDate,
        provider: row.provider,
        notes: row.notes,
        createdAt: row.created_at ?? row.createdAt,
      }));
      res.json(mapped);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/medical-conditions", requireInsforgeAuth(), async (req, res) => {
    try {
      const session = (req as any).insforgeSession;
      const body = {
        ...req.body,
        userId: session.user.id,
        diagnosedDate: req.body.diagnosedDate ? new Date(req.body.diagnosedDate) : null,
      };
      const data = insertMedicalConditionSchema.parse(body);
      // Convert camelCase schema output to snake_case DB columns
      const dbRow: Record<string, any> = {
        user_id: data.userId,
        condition_name: data.conditionName,
        diagnosed_date: data.diagnosedDate instanceof Date ? data.diagnosedDate.toISOString() : data.diagnosedDate ?? null,
        provider: data.provider ?? null,
        notes: data.notes ?? null,
      };
      const condition = await storage.createMedicalCondition(dbRow, session.accessToken);
      res.json(condition);
    } catch (error: any) {
      console.error("[MEDICAL-CONDITIONS POST] Error:", error.message);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/medical-conditions/:id", requireInsforgeAuth(), async (req, res) => {
    try {
      const session = (req as any).insforgeSession;
      const existing = await storage.getMedicalConditionById(req.params.id, session.accessToken);
      if (!existing || (existing.user_id ?? existing.userId) !== session.user.id) {
        return res.status(404).json({ message: "Medical condition not found" });
      }
      // Convert camelCase updates to snake_case
      const dbUpdates: Record<string, any> = {};
      if (req.body.conditionName !== undefined) dbUpdates.condition_name = req.body.conditionName;
      if (req.body.diagnosedDate !== undefined) dbUpdates.diagnosed_date = req.body.diagnosedDate ? new Date(req.body.diagnosedDate).toISOString() : null;
      if (req.body.provider !== undefined) dbUpdates.provider = req.body.provider;
      if (req.body.notes !== undefined) dbUpdates.notes = req.body.notes;
      const updated = await storage.updateMedicalCondition(req.params.id, dbUpdates, session.accessToken);
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/medical-conditions/:id", requireInsforgeAuth(), async (req, res) => {
    try {
      const session = (req as any).insforgeSession;
      const existing = await storage.getMedicalConditionById(req.params.id, session.accessToken);
      if (!existing || (existing.user_id ?? existing.userId) !== session.user.id) {
        return res.status(404).json({ message: "Medical condition not found" });
      }
      await storage.deleteMedicalCondition(req.params.id, session.accessToken);
      res.json({ message: "Deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Claims routes
  app.get("/api/claims", requireInsforgeAuth(), async (req, res) => {
    try {
      const session = (req as any).insforgeSession;
      const claims = await storage.getClaims(session.user.id, session.accessToken);
      res.json(claims);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/claims/:id", requireInsforgeAuth(), async (req, res) => {
    try {
      const session = (req as any).insforgeSession;
      const claim = await storage.getClaim(req.params.id, session.accessToken);
      if (!claim || claim.userId !== session.user.id) {
        return res.status(404).json({ message: "Claim not found" });
      }
      res.json(claim);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/claims", requireInsforgeAuth(), async (req, res) => {
    try {
      const session = (req as any).insforgeSession;
      const data = insertClaimSchema.parse({ ...req.body, userId: session.user.id });
      const claim = await storage.createClaim(data, session.accessToken);
      res.json(claim);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/claims/:id", requireInsforgeAuth(), async (req, res) => {
    try {
      const session = (req as any).insforgeSession;
      const existing = await storage.getClaim(req.params.id, session.accessToken);
      if (!existing || existing.userId !== session.user.id) {
        return res.status(404).json({ message: "Claim not found" });
      }
      const updated = await storage.updateClaim(req.params.id, req.body, session.accessToken);
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/claims/:id", requireInsforgeAuth(), async (req, res) => {
    try {
      const session = (req as any).insforgeSession;
      const existing = await storage.getClaim(req.params.id, session.accessToken);
      if (!existing || existing.userId !== session.user.id) {
        return res.status(404).json({ message: "Claim not found" });
      }
      await storage.deleteClaim(req.params.id, session.accessToken);
      res.json({ message: "Deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Lay Statements routes
  app.get("/api/lay-statements", requireInsforgeAuth(), async (req, res) => {
    try {
      const session = (req as any).insforgeSession;
      const { claimId } = req.query;
      
      if (claimId && typeof claimId === "string") {
        const claim = await storage.getClaim(claimId, session.accessToken);
        if (!claim || claim.userId !== session.user.id) {
          return res.status(404).json({ message: "Claim not found" });
        }
        const statements = await storage.getLayStatementsByClaim(claimId, session.accessToken);
        return res.json(statements);
      }
      
      const statements = await storage.getLayStatements(session.user.id, session.accessToken);
      res.json(statements);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/lay-statements", requireInsforgeAuth(), async (req, res) => {
    try {
      const session = (req as any).insforgeSession;
      const data = insertLayStatementSchema.parse({ ...req.body, userId: session.user.id });
      const statement = await storage.createLayStatement(data, session.accessToken);
      res.json(statement);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/lay-statements/:id", requireInsforgeAuth(), async (req, res) => {
    try {
      const session = (req as any).insforgeSession;
      const existing = await storage.getLayStatementById(req.params.id, session.accessToken);
      if (!existing || existing.userId !== session.user.id) {
        return res.status(404).json({ message: "Lay statement not found" });
      }
      const updated = await storage.updateLayStatement(req.params.id, req.body, session.accessToken);
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/lay-statements/:id", requireInsforgeAuth(), async (req, res) => {
    try {
      const session = (req as any).insforgeSession;
      const existing = await storage.getLayStatementById(req.params.id, session.accessToken);
      if (!existing || existing.userId !== session.user.id) {
        return res.status(404).json({ message: "Lay statement not found" });
      }
      await storage.deleteLayStatement(req.params.id, session.accessToken);
      res.json({ message: "Deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Buddy Statements routes
  app.get("/api/buddy-statements", requireInsforgeAuth(), async (req, res) => {
    try {
      const session = (req as any).insforgeSession;
      const { claimId } = req.query;
      
      if (claimId && typeof claimId === "string") {
        const claim = await storage.getClaim(claimId, session.accessToken);
        if (!claim || claim.userId !== session.user.id) {
          return res.status(404).json({ message: "Claim not found" });
        }
        const statements = await storage.getBuddyStatementsByClaim(claimId, session.accessToken);
        return res.json(statements);
      }
      
      const statements = await storage.getBuddyStatements(session.user.id, session.accessToken);
      res.json(statements);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/buddy-statements", requireInsforgeAuth(), async (req, res) => {
    try {
      const session = (req as any).insforgeSession;
      const data = insertBuddyStatementSchema.parse({ ...req.body, userId: session.user.id });
      const statement = await storage.createBuddyStatement(data, session.accessToken);
      res.json(statement);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/buddy-statements/:id", requireInsforgeAuth(), async (req, res) => {
    try {
      const session = (req as any).insforgeSession;
      const existing = await storage.getBuddyStatementById(req.params.id, session.accessToken);
      if (!existing || existing.userId !== session.user.id) {
        return res.status(404).json({ message: "Buddy statement not found" });
      }
      const updated = await storage.updateBuddyStatement(req.params.id, req.body, session.accessToken);
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/buddy-statements/:id", requireInsforgeAuth(), async (req, res) => {
    try {
      const session = (req as any).insforgeSession;
      const existing = await storage.getBuddyStatementById(req.params.id, session.accessToken);
      if (!existing || existing.userId !== session.user.id) {
        return res.status(404).json({ message: "Buddy statement not found" });
      }
      await storage.deleteBuddyStatement(req.params.id, session.accessToken);
      res.json({ message: "Deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Documents routes
  app.get("/api/documents", requireInsforgeAuth(), async (req, res) => {
    try {
      const session = (req as any).insforgeSession;
      const { claimId } = req.query;
      
      if (claimId && typeof claimId === "string") {
        const claim = await storage.getClaim(claimId, session.accessToken);
        if (!claim || claim.userId !== session.user.id) {
          return res.status(404).json({ message: "Claim not found" });
        }
        const documents = await storage.getDocumentsByClaim(claimId, session.accessToken);
        return res.json(documents);
      }
      
      const documents = await storage.getDocuments(session.user.id, session.accessToken);
      res.json(documents);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/documents/:id", requireInsforgeAuth(), async (req, res) => {
    try {
      const session = (req as any).insforgeSession;
      const existing = await storage.getDocumentById(req.params.id, session.accessToken);
      if (!existing || existing.userId !== session.user.id) {
        return res.status(404).json({ message: "Document not found" });
      }
      await storage.deleteDocument(req.params.id, session.accessToken);
      res.json({ message: "Deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Appeals routes
  app.get("/api/appeals", requireInsforgeAuth(), async (req, res) => {
    try {
      const session = (req as any).insforgeSession;
      const appeals = await storage.getAppeals(session.user.id, session.accessToken);
      res.json(appeals);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/appeals/:id", requireInsforgeAuth(), async (req, res) => {
    try {
      const session = (req as any).insforgeSession;
      const appeal = await storage.getAppeal(req.params.id, session.accessToken);
      if (!appeal || appeal.userId !== session.user.id) {
        return res.status(404).json({ message: "Appeal not found" });
      }
      res.json(appeal);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/appeals", requireInsforgeAuth(), async (req, res) => {
    try {
      const session = (req as any).insforgeSession;
      const data = insertAppealSchema.parse({ ...req.body, userId: session.user.id });
      const appeal = await storage.createAppeal(data, session.accessToken);
      res.json(appeal);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/appeals/:id", requireInsforgeAuth(), async (req, res) => {
    try {
      const session = (req as any).insforgeSession;
      const existing = await storage.getAppeal(req.params.id, session.accessToken);
      if (!existing || existing.userId !== session.user.id) {
        return res.status(404).json({ message: "Appeal not found" });
      }
      const updated = await storage.updateAppeal(req.params.id, req.body, session.accessToken);
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/appeals/:id", requireInsforgeAuth(), async (req, res) => {
    try {
      const session = (req as any).insforgeSession;
      const existing = await storage.getAppeal(req.params.id, session.accessToken);
      if (!existing || existing.userId !== session.user.id) {
        return res.status(404).json({ message: "Appeal not found" });
      }
      await storage.deleteAppeal(req.params.id, session.accessToken);
      res.json({ message: "Deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Referral routes
  app.get("/api/referrals", requireInsforgeAuth(), async (req, res) => {
    try {
      const session = (req as any).insforgeSession;
      const referrals = await storage.getReferrals(session.user.id, session.accessToken);
      res.json(referrals);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/referrals/stats", requireInsforgeAuth(), async (req, res) => {
    try {
      const session = (req as any).insforgeSession;
      const stats = await storage.getReferralStats(session.user.id, session.accessToken);
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/referrals/code/:code", async (req, res) => {
    try {
      const referral = await storage.getReferralByCode(req.params.code);
      if (!referral) {
        return res.status(404).json({ message: "Referral code not found" });
      }
      res.json({ valid: true, referrerId: referral.referrerId });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/referrals", requireInsforgeAuth(), async (req, res) => {
    try {
      const session = (req as any).insforgeSession;
      const code = `VET${session.user.id.substring(0, 4).toUpperCase()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      const data = {
        referrerId: session.user.id,
        referralCode: code,
        referredEmail: req.body.referredEmail || null,
      };
      const referral = await storage.createReferral(data, session.accessToken);
      res.json(referral);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/referrals/:id", requireInsforgeAuth(), async (req, res) => {
    try {
      const session = (req as any).insforgeSession;
      const existing = await storage.getReferralById(req.params.id, session.accessToken);
      if (!existing || existing.referrerId !== session.user.id) {
        return res.status(404).json({ message: "Referral not found" });
      }
      const updated = await storage.updateReferral(req.params.id, req.body, session.accessToken);
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/referrals/:id", requireInsforgeAuth(), async (req, res) => {
    try {
      const session = (req as any).insforgeSession;
      const existing = await storage.getReferralById(req.params.id, session.accessToken);
      if (!existing || existing.referrerId !== session.user.id) {
        return res.status(404).json({ message: "Referral not found" });
      }
      await storage.deleteReferral(req.params.id, session.accessToken);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Consultation routes (public - no auth required for booking)
  app.get("/api/consultations", requireInsforgeAuth(), async (req, res) => {
    try {
      const session = (req as any).insforgeSession;
      const consultations = await storage.getConsultations(session.user.id, session.accessToken);
      res.json(consultations);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/consultations/:id", requireInsforgeAuth(), async (req, res) => {
    try {
      const session = (req as any).insforgeSession;
      const consultation = await storage.getConsultation(req.params.id, session.accessToken);
      if (!consultation || consultation.userId !== session.user.id) {
        return res.status(404).json({ message: "Consultation not found" });
      }
      res.json(consultation);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/consultations", requireInsforgeAuth(), async (req, res) => {
    try {
      const session = (req as any).insforgeSession;
      const data = insertConsultationSchema.parse({
        ...req.body,
        userId: session.user.id,
        scheduledDate: new Date(req.body.scheduledDate),
      });
      const consultation = await storage.createConsultation(data, session.accessToken);
      res.json(consultation);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/consultations/:id", requireInsforgeAuth(), async (req, res) => {
    try {
      const session = (req as any).insforgeSession;
      const existing = await storage.getConsultation(req.params.id, session.accessToken);
      if (!existing || existing.userId !== session.user.id) {
        return res.status(404).json({ message: "Consultation not found" });
      }
      const updated = await storage.updateConsultation(req.params.id, req.body, session.accessToken);
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/consultations/:id/cancel", requireInsforgeAuth(), async (req, res) => {
    try {
      const session = (req as any).insforgeSession;
      const existing = await storage.getConsultation(req.params.id, session.accessToken);
      if (!existing || existing.userId !== session.user.id) {
        return res.status(404).json({ message: "Consultation not found" });
      }
      const cancelled = await storage.cancelConsultation(req.params.id, session.accessToken);
      res.json(cancelled);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // AI Research Routes
  app.post("/api/ai/research", async (req, res) => {
    try {
      const { feature, query, context } = req.body;
      
      if (!feature || !query) {
        return res.status(400).json({ message: "Feature and query are required" });
      }

      const validFeatures: FeatureType[] = [
        "claim_builder", "evidence_automation", "warrior_coach",
        "lay_statement", "buddy_statement", "appeals_hub",
        "evidence_vault", "tdiu_calculator", "education_library"
      ];

      if (!validFeatures.includes(feature)) {
        return res.status(400).json({ message: "Invalid feature type" });
      }

      const response = await getFeatureResearch(feature, query, context);
      res.json({ response });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/ai/condition-guidance", async (req, res) => {
    try {
      const { conditionName } = req.body;
      
      if (!conditionName) {
        return res.status(400).json({ message: "Condition name is required" });
      }

      const guidance = await getConditionGuidance(conditionName);
      res.json(guidance);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/ai/generate-lay-statement", requireInsforgeAuth(), async (req, res) => {
    try {
      const { conditionName, symptoms, dailyImpact, serviceConnection } = req.body;
      
      if (!conditionName || !symptoms || !dailyImpact || !serviceConnection) {
        return res.status(400).json({ message: "All fields are required" });
      }

      const draft = await generateLayStatementDraft(conditionName, symptoms, dailyImpact, serviceConnection);
      res.json({ draft });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/ai/generate-buddy-statement", requireInsforgeAuth(), async (req, res) => {
    try {
      const { conditionName, relationship, observedSymptoms } = req.body;
      
      if (!conditionName || !relationship || !observedSymptoms) {
        return res.status(400).json({ message: "All fields are required" });
      }

      const template = await generateBuddyStatementTemplate(conditionName, relationship, observedSymptoms);
      res.json({ template });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Generate Claim Memorandum (AI-powered)
  const claimMemorandumSchema = z.object({
    veteranName: z.string().min(1, "Veteran name is required"),
    ssn: z.string().optional().default(""),
    phone: z.string().optional().default(""),
    email: z.string().optional().default(""),
    branch: z.string().optional().default("United States Military"),
    conditions: z.array(z.object({
      name: z.string().min(1),
      onsetDate: z.string().optional().default(""),
      frequency: z.string().optional().default("constant"),
      symptoms: z.array(z.string()).optional().default([]),
      connectionType: z.string().optional().default("direct"),
      isPresumptive: z.boolean().optional().default(false),
      dailyImpact: z.string().optional().default("")
    })).min(1, "At least one condition is required"),
    evidence: z.array(z.object({
      type: z.string(),
      description: z.string().optional().default(""),
      fileName: z.string().optional()
    })).optional().default([])
  });

  app.post("/api/ai/generate-claim-memorandum", requireInsforgeAuth(), async (req, res) => {
    try {
      const parseResult = claimMemorandumSchema.safeParse(req.body);
      
      if (!parseResult.success) {
        return res.status(400).json({ 
          message: "Invalid request data", 
          errors: parseResult.error.flatten().fieldErrors 
        });
      }

      const data = parseResult.data;
      const memorandum = await generateClaimMemorandum(data);
      res.json({ memorandum });
    } catch (error: any) {
      console.error("Claim memorandum generation error:", error);
      res.status(500).json({ message: error.message || "Failed to generate claim memorandum. Please try again." });
    }
  });

  app.post("/api/ai/analyze-medical-records", optionalInsforgeAuth(), async (req, res) => {
    try {
      const { isInsforgeAnonKeyConfigured } = await import("./insforge");
      if (!isInsforgeAnonKeyConfigured()) {
        console.warn("[ANALYZE] INSFORGE_ANON_KEY missing or placeholder — analysis unavailable");
        return res.status(503).json({
          message: "Analysis service is not configured. Please add conditions manually in the Conditions step.",
        });
      }

      const body = req.body && typeof req.body === "object" ? req.body : {};
      const { fileData, fileType, fileName, extractedText, serverFilePath } = body;
      const fileDataLen = typeof fileData === "string" ? fileData.length : 0;
      console.log("[ANALYZE] Request received:", {
        serverFilePath: serverFilePath || "(none)",
        fileDataLength: fileDataLen,
        fileType: fileType || "(none)",
        fileName: fileName || "(none)",
        hasExtractedText: !!(extractedText && String(extractedText).trim()),
      });

      // Primary path: read file from server disk (avoids large base64 payloads)
      if (serverFilePath && String(serverFilePath).trim()) {
        const resolvedPath = path.resolve(String(serverFilePath));
        const resolvedTempDir = path.resolve(TEMP_UPLOAD_DIR);

        if (!resolvedPath.startsWith(resolvedTempDir)) {
          console.error("[ANALYZE] Path outside temp dir:", resolvedPath, "vs", resolvedTempDir);
          return res.status(400).json({ message: "Invalid file path" });
        }
        if (!fs.existsSync(resolvedPath)) {
          console.error("[ANALYZE] File not found on disk:", resolvedPath);
          return res.status(404).json({ message: "Uploaded file not found on server. Please re-upload the document." });
        }

        const stats = fs.statSync(resolvedPath);
        console.log(`[ANALYZE] Reading file from disk: ${resolvedPath} (${(stats.size / (1024 * 1024)).toFixed(1)}MB)`);

        // Touch mtime so cleanup doesn't delete the file during long-running analysis
        try { fs.utimesSync(resolvedPath, new Date(), new Date()); } catch {}

        const fileBuffer = fs.readFileSync(resolvedPath);
        const result = await analyzeMedicalRecords(
          "",
          fileType || "application/octet-stream",
          fileName || "document",
          extractedText,
          fileBuffer
        );

        console.log(`[ANALYZE] Analysis complete: ${result.diagnoses.length} diagnoses found`);

        // Clean up temp file after successful analysis
        try { fs.unlinkSync(resolvedPath); } catch {}
        return res.json(result);
      }

      // Legacy path: base64 fileData in request body (for small files / fallback)
      if (!fileData && !extractedText) {
        console.error("[ANALYZE] No file data and no extracted text in request");
        return res.status(400).json({ message: "No file data received. Please re-upload the document." });
      }
      console.log(`[ANALYZE] Using legacy base64 path: fileData=${fileDataLen} chars`);
      const result = await analyzeMedicalRecords(
        fileData || "",
        fileType || "application/octet-stream",
        fileName || "document",
        extractedText
      );
      console.log(`[ANALYZE] Analysis complete: ${result.diagnoses.length} diagnoses found`);
      res.json(result);
    } catch (error: any) {
      const rawMessage = error?.message || "";
      const isTokenOrAuth =
        /invalid token|invalid_token|unauthorized|anon|api key|api_key|authentication|jwt|bearer|not configured|service key/i.test(rawMessage);
      console.error("[ANALYZE] Analysis error:", isTokenOrAuth ? "(token/auth — sanitized)" : rawMessage, error.stack?.slice(0, 300));
      const safeMessage = isTokenOrAuth
        ? "Analysis service is temporarily unavailable. Please add conditions manually in the Conditions step."
        : (rawMessage || "Failed to analyze medical records. Please try again.");
      res.status(isTokenOrAuth ? 503 : 500).json({ message: safeMessage });
    }
  });

  // Public stats endpoint (no auth required for landing page)
  app.get("/api/stats/vets-served", async (req, res) => {
    try {
      // Initialize the counter with starting value if it doesn't exist
      await storage.initializeStat("vets_served", 526);
      const count = await storage.getStat("vets_served");
      res.json({ count });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Stripe API routes - Query Stripe API directly (no database needed)
  app.get("/api/stripe/products", async (req, res) => {
    try {
      const { getUncachableStripeClient } = await import("./stripeClient");
      const stripe = await getUncachableStripeClient();
      const products = await stripe.products.list({ active: true });
      res.json({ data: products.data });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/stripe/prices", async (req, res) => {
    try {
      const { getUncachableStripeClient } = await import("./stripeClient");
      const stripe = await getUncachableStripeClient();
      const prices = await stripe.prices.list({ active: true });
      res.json({ data: prices.data });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/stripe/publishable-key", async (req, res) => {
    try {
      const { getStripePublishableKey } = await import("./stripeClient");
      const key = await getStripePublishableKey();
      res.json({ publishableKey: key });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/stripe/status", async (_req, res) => {
    try {
      const hasKeys = !!(process.env.STRIPE_PUBLISHABLE_KEY && process.env.STRIPE_SECRET_KEY);
      const webhookConfigured = !!process.env.STRIPE_WEBHOOK_SECRET;
      res.json({
        connected: hasKeys,
        webhookConfigured,
        dashboardUrl: "https://dashboard.stripe.com",
      });
    } catch {
      res.json({ connected: false, webhookConfigured: false, dashboardUrl: "https://dashboard.stripe.com" });
    }
  });

  // Price IDs from env so you use your Stripe account's prices (avoids "no such price" errors)
  app.get("/api/stripe/price-ids", (_req, res) => {
    const pro = (process.env.STRIPE_PRICE_ID_PRO || "").trim();
    const deluxe = (process.env.STRIPE_PRICE_ID_DELUXE || "").trim();
    const business = (process.env.STRIPE_PRICE_ID_BUSINESS || "").trim();
    res.json({ pro: pro || null, deluxe: deluxe || null, business: business || null });
  });

  // Contact form endpoint
  const contactSchema = z.object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Valid email is required"),
    subject: z.string().min(1, "Subject is required"),
    message: z.string().min(1, "Message is required"),
    contactType: z.enum(["admin", "billing"])
  });

  app.post("/api/contact", async (req, res) => {
    try {
      const parseResult = contactSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ 
          message: "Invalid form data", 
          errors: parseResult.error.flatten().fieldErrors 
        });
      }

      const { name, email, subject, message, contactType } = parseResult.data;
      
      const primaryEmail = contactType === "admin" 
        ? "Frontdesk@vaclaimnavigator.com" 
        : "Billing@vaclaimnavigator.com";
      const bccEmail = "vaclaimnavigatorcontact@gmail.com";
      
      // Contact form submitted - email integration placeholder
      // In production, integrate with email service (SendGrid, Resend, etc.)

      res.json({ 
        success: true, 
        message: "Your message has been sent successfully" 
      });
    } catch (error: any) {
      console.error("Contact form error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Diagnostic endpoint to check promo codes (admin only - remove in production)
  app.get("/api/stripe/promo-codes", requireInsforgeAuth(), async (req, res) => {
    try {
      const { stripeService } = await import("./stripeService");
      const promoCodes = await stripeService.listPromotionCodes();
      res.json({ promoCodes });
    } catch (error: any) {
      console.error("Error fetching promo codes:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Verify specific promo code
  app.get("/api/stripe/promo-codes/:id", requireInsforgeAuth(), async (req, res) => {
    try {
      const { stripeService } = await import("./stripeService");
      const result = await stripeService.verifyPromotionCode(req.params.id);
      res.json(result);
    } catch (error: any) {
      console.error("Error verifying promo code:", error);
      res.status(500).json({ message: error.message });
    }
  });

  const checkoutSchema = z.object({
    priceId: z.string().min(1, "Price ID is required"),
    tier: z.enum(["pro", "deluxe", "business"]).optional().default("pro")
  });

  app.post("/api/stripe/checkout", requireInsforgeAuth(), async (req, res) => {
    try {
      const session = (req as any).insforgeSession;
      const user = session.user;
      
      const parseResult = checkoutSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ 
          message: "Invalid request data", 
          errors: parseResult.error.flatten().fieldErrors 
        });
      }
      
      const { priceId, tier } = parseResult.data;

      // Only allow price IDs configured in env (avoids "no such price" from wrong/hardcoded IDs)
      const allowedPro = (process.env.STRIPE_PRICE_ID_PRO || "").trim();
      const allowedDeluxe = (process.env.STRIPE_PRICE_ID_DELUXE || "").trim();
      const allowedBusiness = (process.env.STRIPE_PRICE_ID_BUSINESS || "").trim();
      const allowedIds = [allowedPro, allowedDeluxe, allowedBusiness].filter(Boolean);
      if (!allowedIds.length) {
        return res.status(503).json({
          message: "Payment is not configured. Admin: set STRIPE_PRICE_ID_PRO and STRIPE_PRICE_ID_DELUXE in .env from your Stripe Dashboard.",
        });
      }
      if (!allowedIds.includes(priceId)) {
        return res.status(400).json({
          message: "Invalid price for this tier. Use the price IDs from your Stripe Dashboard and set STRIPE_PRICE_ID_PRO / STRIPE_PRICE_ID_DELUXE in .env.",
        });
      }

      const { stripeService } = await import("./stripeService");

      // Get user from database to check stripeCustomerId
      const dbUser = await storage.getUser(user.id, session.accessToken);
      if (!dbUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Create or get customer (verify existing customer still exists in Stripe)
      let customerId = dbUser.stripeCustomerId;
      let needsNewCustomer = !customerId;
      
      if (customerId) {
        // Verify customer still exists in Stripe
        const exists = await stripeService.customerExists(customerId);
        if (!exists) {
          needsNewCustomer = true;
        }
      }
      
      if (needsNewCustomer) {
        const customer = await stripeService.createCustomer(user.email, user.id);
        await storage.updateUser(user.id, { stripeCustomerId: customer.id }, session.accessToken);
        customerId = customer.id;
      }

      // Create checkout session with metadata so webhook can update user tier
      const checkoutSession = await stripeService.createCheckoutSession(
        customerId!,
        priceId,
        `${req.protocol}://${req.get('host')}/dashboard?payment=success&tier=${tier}`,
        `${req.protocol}://${req.get('host')}/dashboard?payment=cancelled`,
        undefined,
        { userId: user.id, tier }
      );

      res.json({ url: checkoutSession.url });
    } catch (error: any) {
      console.error("Stripe checkout error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // File upload routes using Insforge storage
  app.post("/api/uploads/request-url", optionalInsforgeAuth(), async (req, res) => {
    try {
      const { name, size, contentType } = req.body ?? {};
      console.log("[UPLOAD-URL] Request received:", { name, size, contentType });

      if (!name) {
        console.warn("[UPLOAD-URL] Missing 'name' in body. Body was:", JSON.stringify(req.body));
        return res.status(400).json({
          error: "Missing required field: name",
        });
      }

      const objectId = randomUUID();
      const storagePath = `uploads/${objectId}/${name}`;
      const uploadURL = `/api/storage/upload/${storagePath}`;
      const objectPath = `/objects/${storagePath}`;

      console.log("[UPLOAD-URL] Returning:", { uploadURL, objectPath });
      res.json({
        uploadURL,
        objectPath,
        metadata: { name, size, contentType },
      });
    } catch (error: any) {
      console.error("[UPLOAD-URL] Error generating upload path:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Failed to generate upload path" });
      }
    }
  });

  // Serve/download files - tries Insforge storage first, falls back to local temp directory
  app.get("/objects/:path(*)", async (req, res) => {
    try {
      const objectPath = req.params.path;
      const filePath = objectPath.replace(/^\/?objects\//, '');

      // Try Insforge storage first
      try {
        await insforgeStorage.serveFile(filePath, res);
        return;
      } catch (storageErr: any) {
        console.warn("Insforge storage serve failed, checking local files:", storageErr.message);
      }

      // Fallback: look for the file in temp-uploads (matches by filename suffix)
      const files = fs.readdirSync(TEMP_UPLOAD_DIR);
      const normalizedPath = filePath.replace(/\//g, '_');
      const matchingFile = files.find(f => f.endsWith(normalizedPath));
      if (matchingFile) {
        const localPath = path.join(TEMP_UPLOAD_DIR, matchingFile);
        const buffer = fs.readFileSync(localPath);
        const ext = path.extname(filePath).toLowerCase();
        const mimeMap: Record<string, string> = {
          '.pdf': 'application/pdf', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
          '.png': 'image/png', '.gif': 'image/gif', '.doc': 'application/msword',
          '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        };
        res.set({
          'Content-Type': mimeMap[ext] || 'application/octet-stream',
          'Content-Length': buffer.length.toString(),
        });
        return res.send(buffer);
      }

      res.status(404).json({ error: "File not found" });
    } catch (error: any) {
      console.error("Error serving file:", error);
      if (!res.headersSent) {
        res.status(404).json({ error: "File not found" });
      }
    }
  });

  return httpServer;
}
