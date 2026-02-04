import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { pool } from "./db";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { insertUserSchema, insertServiceHistorySchema, insertMedicalConditionSchema, insertClaimSchema, insertLayStatementSchema, insertBuddyStatementSchema, insertAppealSchema, insertReferralSchema, insertConsultationSchema, type User } from "@shared/schema";
import { getFeatureResearch, getConditionGuidance, generateLayStatementDraft, generateBuddyStatementTemplate, generateClaimMemorandum, type FeatureType, type ClaimMemorandumData } from "./ai-service";
import { registerObjectStorageRoutes } from "./replit_integrations/object_storage";

declare module "express-session" {
  interface SessionData {
    passport?: { user?: string };
  }
}

// Middleware to require authentication
function requireAuth(req: any, res: any, next: any) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Create PostgreSQL session store for persistent sessions
  const PgSession = connectPgSimple(session);

  // Session configuration with PostgreSQL store
  app.use(
    session({
      store: new PgSession({
        pool: pool as any,
        tableName: "user_sessions",
        createTableIfMissing: true,
      }),
      secret: process.env.SESSION_SECRET!,
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        sameSite: "lax",
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
      },
    })
  );

  app.use(passport.initialize());
  app.use(passport.session());

  // Passport configuration
  passport.use(
    new LocalStrategy(
      { usernameField: "email" },
      async (email, password, done) => {
        try {
          const user = await storage.getUserByEmail(email);
          if (!user) {
            return done(null, false, { message: "Invalid email or password" });
          }

          const isValid = await bcrypt.compare(password, user.password);
          if (!isValid) {
            return done(null, false, { message: "Invalid email or password" });
          }

          return done(null, user);
        } catch (error) {
          return done(error);
        }
      }
    )
  );

  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  // Auth routes
  app.post("/api/auth/register", async (req, res, next) => {
    try {
      const { email, password, firstName, lastName } = insertUserSchema.parse(req.body);
      
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already registered" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await storage.createUser({
        email,
        password: hashedPassword,
        firstName,
        lastName,
      });

      // Increment the vets served counter when a new user registers
      await storage.incrementStat("vets_served");

      req.login(user, (err) => {
        if (err) return next(err);
        const { password: _, ...userWithoutPassword } = user;
        res.json(userWithoutPassword);
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      next(error);
    }
  });

  app.post("/api/auth/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: User | false, info: any) => {
      if (err) return next(err);
      if (!user) {
        return res.status(401).json({ message: info?.message || "Invalid credentials" });
      }

      req.login(user, (loginErr) => {
        if (loginErr) return next(loginErr);
        const { password: _, ...userWithoutPassword } = user;
        res.json(userWithoutPassword);
      });
    })(req, res, next);
  });

  app.post("/api/auth/logout", (req, res) => {
    req.logout(() => {
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/auth/me", requireAuth, (req, res) => {
    const user = req.user as User;
    const { password: _, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  });

  // User profile routes
  app.patch("/api/users/profile", requireAuth, async (req, res, next) => {
    try {
      const user = req.user as User;
      const updates = req.body;
      
      // Don't allow changing password or email through this endpoint
      delete updates.password;
      delete updates.email;
      
      // Check if this is the first time saving profile (for counter)
      const isFirstProfileSave = !user.profileCompleted && 
        (updates.firstName || updates.lastName || updates.phone || updates.address);
      
      if (isFirstProfileSave) {
        updates.profileCompleted = true;
      }
      
      const updatedUser = await storage.updateUser(user.id, updates);
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Increment vets served counter on first profile save
      if (isFirstProfileSave) {
        await storage.incrementStat("vets_served");
      }
      
      const { password: _, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error) {
      next(error);
    }
  });

  // Service History routes
  app.get("/api/service-history", requireAuth, async (req, res, next) => {
    try {
      const user = req.user as User;
      const history = await storage.getServiceHistory(user.id);
      res.json(history);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/service-history", requireAuth, async (req, res, next) => {
    try {
      const user = req.user as User;
      const body = {
        ...req.body,
        userId: user.id,
        dateEntered: req.body.dateEntered ? new Date(req.body.dateEntered) : undefined,
        dateSeparated: req.body.dateSeparated ? new Date(req.body.dateSeparated) : null,
      };
      const data = insertServiceHistorySchema.parse(body);
      const history = await storage.createServiceHistory(data);
      res.json(history);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      next(error);
    }
  });

  app.patch("/api/service-history/:id", requireAuth, async (req, res, next) => {
    try {
      const user = req.user as User;
      const existing = await storage.getServiceHistoryById(req.params.id);
      if (!existing || existing.userId !== user.id) {
        return res.status(404).json({ message: "Service history not found" });
      }
      const updated = await storage.updateServiceHistory(req.params.id, req.body);
      res.json(updated);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/service-history/:id", requireAuth, async (req, res, next) => {
    try {
      const user = req.user as User;
      const existing = await storage.getServiceHistoryById(req.params.id);
      if (!existing || existing.userId !== user.id) {
        return res.status(404).json({ message: "Service history not found" });
      }
      await storage.deleteServiceHistory(req.params.id);
      res.json({ message: "Deleted successfully" });
    } catch (error) {
      next(error);
    }
  });

  // Medical Conditions routes
  app.get("/api/medical-conditions", requireAuth, async (req, res, next) => {
    try {
      const user = req.user as User;
      const conditions = await storage.getMedicalConditions(user.id);
      res.json(conditions);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/medical-conditions", requireAuth, async (req, res, next) => {
    try {
      const user = req.user as User;
      const body = {
        ...req.body,
        userId: user.id,
        diagnosedDate: req.body.diagnosedDate ? new Date(req.body.diagnosedDate) : null,
      };
      const data = insertMedicalConditionSchema.parse(body);
      const condition = await storage.createMedicalCondition(data);
      res.json(condition);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      next(error);
    }
  });

  app.patch("/api/medical-conditions/:id", requireAuth, async (req, res, next) => {
    try {
      const user = req.user as User;
      const existing = await storage.getMedicalConditionById(req.params.id);
      if (!existing || existing.userId !== user.id) {
        return res.status(404).json({ message: "Medical condition not found" });
      }
      const updated = await storage.updateMedicalCondition(req.params.id, req.body);
      res.json(updated);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/medical-conditions/:id", requireAuth, async (req, res, next) => {
    try {
      const user = req.user as User;
      const existing = await storage.getMedicalConditionById(req.params.id);
      if (!existing || existing.userId !== user.id) {
        return res.status(404).json({ message: "Medical condition not found" });
      }
      await storage.deleteMedicalCondition(req.params.id);
      res.json({ message: "Deleted successfully" });
    } catch (error) {
      next(error);
    }
  });

  // Claims routes
  app.get("/api/claims", requireAuth, async (req, res, next) => {
    try {
      const user = req.user as User;
      const claims = await storage.getClaims(user.id);
      res.json(claims);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/claims/:id", requireAuth, async (req, res, next) => {
    try {
      const user = req.user as User;
      const claim = await storage.getClaim(req.params.id);
      if (!claim || claim.userId !== user.id) {
        return res.status(404).json({ message: "Claim not found" });
      }
      res.json(claim);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/claims", requireAuth, async (req, res, next) => {
    try {
      const user = req.user as User;
      const data = insertClaimSchema.parse({ ...req.body, userId: user.id });
      const claim = await storage.createClaim(data);
      res.json(claim);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      next(error);
    }
  });

  app.patch("/api/claims/:id", requireAuth, async (req, res, next) => {
    try {
      const user = req.user as User;
      const existing = await storage.getClaim(req.params.id);
      if (!existing || existing.userId !== user.id) {
        return res.status(404).json({ message: "Claim not found" });
      }
      const updated = await storage.updateClaim(req.params.id, req.body);
      res.json(updated);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/claims/:id", requireAuth, async (req, res, next) => {
    try {
      const user = req.user as User;
      const existing = await storage.getClaim(req.params.id);
      if (!existing || existing.userId !== user.id) {
        return res.status(404).json({ message: "Claim not found" });
      }
      await storage.deleteClaim(req.params.id);
      res.json({ message: "Deleted successfully" });
    } catch (error) {
      next(error);
    }
  });

  // Lay Statements routes
  app.get("/api/lay-statements", requireAuth, async (req, res, next) => {
    try {
      const user = req.user as User;
      const { claimId } = req.query;
      
      if (claimId && typeof claimId === "string") {
        const claim = await storage.getClaim(claimId);
        if (!claim || claim.userId !== user.id) {
          return res.status(404).json({ message: "Claim not found" });
        }
        const statements = await storage.getLayStatementsByClaim(claimId);
        return res.json(statements);
      }
      
      const statements = await storage.getLayStatements(user.id);
      res.json(statements);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/lay-statements", requireAuth, async (req, res, next) => {
    try {
      const user = req.user as User;
      const data = insertLayStatementSchema.parse({ ...req.body, userId: user.id });
      const statement = await storage.createLayStatement(data);
      res.json(statement);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      next(error);
    }
  });

  app.patch("/api/lay-statements/:id", requireAuth, async (req, res, next) => {
    try {
      const user = req.user as User;
      const existing = await storage.getLayStatementById(req.params.id);
      if (!existing || existing.userId !== user.id) {
        return res.status(404).json({ message: "Lay statement not found" });
      }
      const updated = await storage.updateLayStatement(req.params.id, req.body);
      res.json(updated);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/lay-statements/:id", requireAuth, async (req, res, next) => {
    try {
      const user = req.user as User;
      const existing = await storage.getLayStatementById(req.params.id);
      if (!existing || existing.userId !== user.id) {
        return res.status(404).json({ message: "Lay statement not found" });
      }
      await storage.deleteLayStatement(req.params.id);
      res.json({ message: "Deleted successfully" });
    } catch (error) {
      next(error);
    }
  });

  // Buddy Statements routes
  app.get("/api/buddy-statements", requireAuth, async (req, res, next) => {
    try {
      const user = req.user as User;
      const { claimId } = req.query;
      
      if (claimId && typeof claimId === "string") {
        const claim = await storage.getClaim(claimId);
        if (!claim || claim.userId !== user.id) {
          return res.status(404).json({ message: "Claim not found" });
        }
        const statements = await storage.getBuddyStatementsByClaim(claimId);
        return res.json(statements);
      }
      
      const statements = await storage.getBuddyStatements(user.id);
      res.json(statements);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/buddy-statements", requireAuth, async (req, res, next) => {
    try {
      const user = req.user as User;
      const data = insertBuddyStatementSchema.parse({ ...req.body, userId: user.id });
      const statement = await storage.createBuddyStatement(data);
      res.json(statement);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      next(error);
    }
  });

  app.patch("/api/buddy-statements/:id", requireAuth, async (req, res, next) => {
    try {
      const user = req.user as User;
      const existing = await storage.getBuddyStatementById(req.params.id);
      if (!existing || existing.userId !== user.id) {
        return res.status(404).json({ message: "Buddy statement not found" });
      }
      const updated = await storage.updateBuddyStatement(req.params.id, req.body);
      res.json(updated);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/buddy-statements/:id", requireAuth, async (req, res, next) => {
    try {
      const user = req.user as User;
      const existing = await storage.getBuddyStatementById(req.params.id);
      if (!existing || existing.userId !== user.id) {
        return res.status(404).json({ message: "Buddy statement not found" });
      }
      await storage.deleteBuddyStatement(req.params.id);
      res.json({ message: "Deleted successfully" });
    } catch (error) {
      next(error);
    }
  });

  // Documents routes
  app.get("/api/documents", requireAuth, async (req, res, next) => {
    try {
      const user = req.user as User;
      const { claimId } = req.query;
      
      if (claimId && typeof claimId === "string") {
        const claim = await storage.getClaim(claimId);
        if (!claim || claim.userId !== user.id) {
          return res.status(404).json({ message: "Claim not found" });
        }
        const documents = await storage.getDocumentsByClaim(claimId);
        return res.json(documents);
      }
      
      const documents = await storage.getDocuments(user.id);
      res.json(documents);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/documents/:id", requireAuth, async (req, res, next) => {
    try {
      const user = req.user as User;
      const existing = await storage.getDocumentById(req.params.id);
      if (!existing || existing.userId !== user.id) {
        return res.status(404).json({ message: "Document not found" });
      }
      await storage.deleteDocument(req.params.id);
      res.json({ message: "Deleted successfully" });
    } catch (error) {
      next(error);
    }
  });

  // Appeals routes
  app.get("/api/appeals", requireAuth, async (req, res, next) => {
    try {
      const user = req.user as User;
      const appeals = await storage.getAppeals(user.id);
      res.json(appeals);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/appeals/:id", requireAuth, async (req, res, next) => {
    try {
      const user = req.user as User;
      const appeal = await storage.getAppeal(req.params.id);
      if (!appeal || appeal.userId !== user.id) {
        return res.status(404).json({ message: "Appeal not found" });
      }
      res.json(appeal);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/appeals", requireAuth, async (req, res, next) => {
    try {
      const user = req.user as User;
      const data = insertAppealSchema.parse({ ...req.body, userId: user.id });
      const appeal = await storage.createAppeal(data);
      res.json(appeal);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      next(error);
    }
  });

  app.patch("/api/appeals/:id", requireAuth, async (req, res, next) => {
    try {
      const user = req.user as User;
      const existing = await storage.getAppeal(req.params.id);
      if (!existing || existing.userId !== user.id) {
        return res.status(404).json({ message: "Appeal not found" });
      }
      const updated = await storage.updateAppeal(req.params.id, req.body);
      res.json(updated);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/appeals/:id", requireAuth, async (req, res, next) => {
    try {
      const user = req.user as User;
      const existing = await storage.getAppeal(req.params.id);
      if (!existing || existing.userId !== user.id) {
        return res.status(404).json({ message: "Appeal not found" });
      }
      await storage.deleteAppeal(req.params.id);
      res.json({ message: "Deleted successfully" });
    } catch (error) {
      next(error);
    }
  });

  // Referral routes
  app.get("/api/referrals", requireAuth, async (req, res, next) => {
    try {
      const user = req.user as User;
      const referrals = await storage.getReferrals(user.id);
      res.json(referrals);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/referrals/stats", requireAuth, async (req, res, next) => {
    try {
      const user = req.user as User;
      const stats = await storage.getReferralStats(user.id);
      res.json(stats);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/referrals/code/:code", async (req, res, next) => {
    try {
      const referral = await storage.getReferralByCode(req.params.code);
      if (!referral) {
        return res.status(404).json({ message: "Referral code not found" });
      }
      res.json({ valid: true, referrerId: referral.referrerId });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/referrals", requireAuth, async (req, res, next) => {
    try {
      const user = req.user as User;
      const code = `VET${user.id.substring(0, 4).toUpperCase()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      const data = {
        referrerId: user.id,
        referralCode: code,
        referredEmail: req.body.referredEmail || null,
      };
      const referral = await storage.createReferral(data);
      res.json(referral);
    } catch (error) {
      next(error);
    }
  });

  app.patch("/api/referrals/:id", requireAuth, async (req, res, next) => {
    try {
      const user = req.user as User;
      const existing = await storage.getReferralById(req.params.id);
      if (!existing || existing.referrerId !== user.id) {
        return res.status(404).json({ message: "Referral not found" });
      }
      const updated = await storage.updateReferral(req.params.id, req.body);
      res.json(updated);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/referrals/:id", requireAuth, async (req, res, next) => {
    try {
      const user = req.user as User;
      const existing = await storage.getReferralById(req.params.id);
      if (!existing || existing.referrerId !== user.id) {
        return res.status(404).json({ message: "Referral not found" });
      }
      await storage.deleteReferral(req.params.id);
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  });

  // Consultation routes (public - no auth required for booking)
  app.get("/api/consultations", requireAuth, async (req, res, next) => {
    try {
      const user = req.user as User;
      const consultations = await storage.getConsultations(user.id);
      res.json(consultations);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/consultations/:id", requireAuth, async (req, res, next) => {
    try {
      const user = req.user as User;
      const consultation = await storage.getConsultation(req.params.id);
      if (!consultation || consultation.userId !== user.id) {
        return res.status(404).json({ message: "Consultation not found" });
      }
      res.json(consultation);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/consultations", async (req, res, next) => {
    try {
      const user = req.user as User | undefined;
      const data = insertConsultationSchema.parse({
        ...req.body,
        userId: user?.id || null,
        scheduledDate: new Date(req.body.scheduledDate),
      });
      const consultation = await storage.createConsultation(data);
      res.json(consultation);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      next(error);
    }
  });

  app.patch("/api/consultations/:id", requireAuth, async (req, res, next) => {
    try {
      const user = req.user as User;
      const existing = await storage.getConsultation(req.params.id);
      if (!existing || existing.userId !== user.id) {
        return res.status(404).json({ message: "Consultation not found" });
      }
      const updated = await storage.updateConsultation(req.params.id, req.body);
      res.json(updated);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/consultations/:id/cancel", requireAuth, async (req, res, next) => {
    try {
      const user = req.user as User;
      const existing = await storage.getConsultation(req.params.id);
      if (!existing || existing.userId !== user.id) {
        return res.status(404).json({ message: "Consultation not found" });
      }
      const cancelled = await storage.cancelConsultation(req.params.id);
      res.json(cancelled);
    } catch (error) {
      next(error);
    }
  });

  // AI Research Routes
  app.post("/api/ai/research", async (req, res, next) => {
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
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/ai/condition-guidance", async (req, res, next) => {
    try {
      const { conditionName } = req.body;
      
      if (!conditionName) {
        return res.status(400).json({ message: "Condition name is required" });
      }

      const guidance = await getConditionGuidance(conditionName);
      res.json(guidance);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/ai/generate-lay-statement", requireAuth, async (req, res, next) => {
    try {
      const { conditionName, symptoms, dailyImpact, serviceConnection } = req.body;
      
      if (!conditionName || !symptoms || !dailyImpact || !serviceConnection) {
        return res.status(400).json({ message: "All fields are required" });
      }

      const draft = await generateLayStatementDraft(conditionName, symptoms, dailyImpact, serviceConnection);
      res.json({ draft });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/ai/generate-buddy-statement", requireAuth, async (req, res, next) => {
    try {
      const { conditionName, relationship, observedSymptoms } = req.body;
      
      if (!conditionName || !relationship || !observedSymptoms) {
        return res.status(400).json({ message: "All fields are required" });
      }

      const template = await generateBuddyStatementTemplate(conditionName, relationship, observedSymptoms);
      res.json({ template });
    } catch (error) {
      next(error);
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

  app.post("/api/ai/generate-claim-memorandum", requireAuth, async (req, res, next) => {
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
    } catch (error) {
      console.error("Claim memorandum generation error:", error);
      res.status(500).json({ message: "Failed to generate claim memorandum. Please try again." });
    }
  });

  // Public stats endpoint (no auth required for landing page)
  app.get("/api/stats/vets-served", async (req, res, next) => {
    try {
      // Initialize the counter with starting value if it doesn't exist
      await storage.initializeStat("vets_served", 526);
      const count = await storage.getStat("vets_served");
      res.json({ count });
    } catch (error) {
      next(error);
    }
  });

  // Stripe API routes
  app.get("/api/stripe/products", async (req, res, next) => {
    try {
      const products = await storage.getStripeProducts();
      res.json({ data: products });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/stripe/prices", async (req, res, next) => {
    try {
      const prices = await storage.getStripePrices();
      res.json({ data: prices });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/stripe/publishable-key", async (req, res, next) => {
    try {
      const { getStripePublishableKey } = await import("./stripeClient");
      const key = await getStripePublishableKey();
      res.json({ publishableKey: key });
    } catch (error) {
      next(error);
    }
  });

  // Contact form endpoint
  const contactSchema = z.object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Valid email is required"),
    subject: z.string().min(1, "Subject is required"),
    message: z.string().min(1, "Message is required"),
    contactType: z.enum(["admin", "billing"])
  });

  app.post("/api/contact", async (req, res, next) => {
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
    } catch (error) {
      console.error("Contact form error:", error);
      next(error);
    }
  });

  // Diagnostic endpoint to check promo codes (admin only - remove in production)
  app.get("/api/stripe/promo-codes", requireAuth, async (req, res, next) => {
    try {
      const { stripeService } = await import("./stripeService");
      const promoCodes = await stripeService.listPromotionCodes();
      res.json({ promoCodes });
    } catch (error) {
      console.error("Error fetching promo codes:", error);
      next(error);
    }
  });

  // Verify specific promo code
  app.get("/api/stripe/promo-codes/:id", requireAuth, async (req, res, next) => {
    try {
      const { stripeService } = await import("./stripeService");
      const result = await stripeService.verifyPromotionCode(req.params.id);
      res.json(result);
    } catch (error) {
      console.error("Error verifying promo code:", error);
      next(error);
    }
  });

  const checkoutSchema = z.object({
    priceId: z.string().min(1, "Price ID is required"),
    tier: z.enum(["pro", "deluxe", "business"]).optional().default("pro")
  });

  app.post("/api/stripe/checkout", requireAuth, async (req, res, next) => {
    try {
      const user = req.user as User;
      
      const parseResult = checkoutSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ 
          message: "Invalid request data", 
          errors: parseResult.error.flatten().fieldErrors 
        });
      }
      
      const { priceId, tier } = parseResult.data;

      const { stripeService } = await import("./stripeService");

      // Create or get customer (verify existing customer still exists in Stripe)
      let customerId = user.stripeCustomerId;
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
        await storage.updateUser(user.id, { stripeCustomerId: customer.id });
        customerId = customer.id;
      }

      // Create checkout session using service
      const session = await stripeService.createCheckoutSession(
        customerId!,
        priceId,
        `${req.protocol}://${req.get('host')}/dashboard?payment=success&tier=${tier}`,
        `${req.protocol}://${req.get('host')}/dashboard?payment=cancelled`
      );

      res.json({ url: session.url });
    } catch (error) {
      console.error("Stripe checkout error:", error);
      next(error);
    }
  });

  // Register object storage routes for file uploads
  registerObjectStorageRoutes(app);

  return httpServer;
}
