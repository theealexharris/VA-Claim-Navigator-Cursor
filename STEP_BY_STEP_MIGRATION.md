# Step-by-Step Migration Guide

This guide shows you **exactly** what to change in your code, line by line.

## Step 2: Update Routes (server/routes.ts)

### Step 2.1: Update the Imports at the Top

**FIND THIS** (lines 1-13):
```typescript
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
```

**REPLACE WITH THIS**:
```typescript
import type { Express } from "express";
import { createServer, type Server } from "http";
import { InsforgeStorageService } from "./insforge-storage-service";
import { 
  registerUser, 
  signInUser, 
  signOutUser,
  requireInsforgeAuth,
  getInsforgeSession 
} from "./insforge-auth";
import { insforgeStorage } from "./insforge-storage";
import { z } from "zod";
import { insertUserSchema, insertServiceHistorySchema, insertMedicalConditionSchema, insertClaimSchema, insertLayStatementSchema, insertBuddyStatementSchema, insertAppealSchema, insertReferralSchema, insertConsultationSchema, type User } from "@shared/schema";
import { getFeatureResearch, getConditionGuidance, generateLayStatementDraft, generateBuddyStatementTemplate, generateClaimMemorandum, type FeatureType, type ClaimMemorandumData } from "./ai-service";
```

### Step 2.2: Remove Old Session/Passport Setup

**FIND THIS** (lines 15-94):
```typescript
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
```

**REPLACE WITH THIS**:
```typescript
export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Create Insforge storage service instance
  const storage = new InsforgeStorageService();
```

### Step 2.3: Update Auth Routes

**FIND THIS** (lines 96-128):
```typescript
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
```

**REPLACE WITH THIS**:
```typescript
  // Auth routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { email, password, firstName, lastName } = insertUserSchema.parse(req.body);
      
      const result = await registerUser(
        email, 
        password, 
        `${firstName} ${lastName}`.trim()
      );
      
      if (result?.requireEmailVerification) {
        return res.json({ 
          message: "Please verify your email",
          requireEmailVerification: true 
        });
      }
      
      // Increment stats (need to pass accessToken for authenticated requests)
      if (result?.accessToken) {
        await storage.incrementStat("vets_served", result.accessToken);
      }
      
      res.json({ 
        user: result.user,
        accessToken: result.accessToken 
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(400).json({ message: error.message || "Registration failed" });
    }
  });
```

**FIND THIS** (lines 130-143):
```typescript
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
```

**REPLACE WITH THIS**:
```typescript
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      const result = await signInUser(email, password);
      
      res.json({ 
        user: result.user,
        accessToken: result.accessToken 
      });
    } catch (error: any) {
      res.status(401).json({ 
        message: error.message || "Invalid credentials" 
      });
    }
  });
```

**FIND THIS** (lines 145-149):
```typescript
  app.post("/api/auth/logout", (req, res) => {
    req.logout(() => {
      res.json({ message: "Logged out successfully" });
    });
  });
```

**REPLACE WITH THIS**:
```typescript
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
```

**FIND THIS** (lines 151-155):
```typescript
  app.get("/api/auth/me", requireAuth, (req, res) => {
    const user = req.user as User;
    const { password: _, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  });
```

**REPLACE WITH THIS**:
```typescript
  app.get("/api/auth/me", requireInsforgeAuth(), async (req, res) => {
    const session = (req as any).insforgeSession;
    res.json({ user: session.user });
  });
```

### Step 2.4: Update Protected Routes

For **EVERY** route that uses `requireAuth`, you need to:

1. **Change** `requireAuth` to `requireInsforgeAuth()`
2. **Change** `req.user` to `(req as any).insforgeSession.user`
3. **Add** `session.accessToken` when calling storage methods

**EXAMPLE - Service History Route:**

**FIND THIS**:
```typescript
  app.get("/api/service-history", requireAuth, async (req, res, next) => {
    try {
      const user = req.user as User;
      const history = await storage.getServiceHistory(user.id);
      res.json(history);
    } catch (error) {
      next(error);
    }
  });
```

**REPLACE WITH THIS**:
```typescript
  app.get("/api/service-history", requireInsforgeAuth(), async (req, res) => {
    try {
      const session = (req as any).insforgeSession;
      const history = await storage.getServiceHistory(session.user.id, session.accessToken);
      res.json(history);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
```

### Step 2.5: Update Object Storage Routes

**FIND THIS** (near the end of registerRoutes):
```typescript
  registerObjectStorageRoutes(app);
```

**REPLACE WITH THIS**:
```typescript
  // File upload routes using Insforge storage
  app.post("/api/uploads/request-url", requireInsforgeAuth(), async (req, res) => {
    try {
      const { name, size, contentType } = req.body;
      
      if (!name) {
        return res.status(400).json({
          error: "Missing required field: name",
        });
      }

      const objectId = require('crypto').randomUUID();
      const path = `uploads/${objectId}/${name}`;
      
      res.json({
        uploadPath: path,
        objectPath: `/objects/${objectId}`,
        metadata: { name, size, contentType },
      });
    } catch (error: any) {
      console.error("Error generating upload path:", error);
      res.status(500).json({ error: "Failed to generate upload path" });
    }
  });

  // Serve/download files
  app.get("/objects/:path(*)", async (req, res) => {
    try {
      const objectPath = req.params.path;
      await insforgeStorage.serveFile(objectPath, res);
    } catch (error: any) {
      console.error("Error serving file:", error);
      res.status(404).json({ error: "File not found" });
    }
  });
```

## Step 3: Update Frontend (client/src/lib/api.ts)

This step is **optional** - you can keep using your existing API calls, but update them to handle the new response format.

### What Changed:
- Auth endpoints now return `{ user, accessToken }` instead of just `user`
- You need to store the `accessToken` and send it in `Authorization: Bearer <token>` header

**Example Update:**

**BEFORE:**
```typescript
const response = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
});
const user = await response.json();
```

**AFTER:**
```typescript
const response = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
});
const { user, accessToken } = await response.json();
// Store accessToken in localStorage or httpOnly cookie
localStorage.setItem('accessToken', accessToken);

// Use in future requests:
const protectedResponse = await fetch('/api/service-history', {
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});
```

## Step 4: Database Schema Migration

This step requires checking if your Insforge database has the same tables.

### Option A: Use Insforge MCP Tools (Recommended)

I can help you check and create tables using the Insforge MCP tools. Just ask me to:
1. Check your current database schema
2. Create missing tables
3. Verify table structure

### Option B: Manual Migration

1. Go to your Insforge dashboard
2. Navigate to Database section
3. Check if tables exist (they should match `shared/schema.ts`)
4. If tables don't exist, you'll need to create them

## Quick Reference: What to Change

| Old Code | New Code |
|----------|----------|
| `requireAuth` | `requireInsforgeAuth()` |
| `req.user` | `(req as any).insforgeSession.user` |
| `storage.getUser(id)` | `storage.getUser(id, accessToken)` |
| `passport.authenticate()` | `signInUser(email, password)` |
| `bcrypt.hash()` | `registerUser()` (handles hashing) |
| `registerObjectStorageRoutes(app)` | Insforge storage routes (see Step 2.5) |

## Need Help?

If you get stuck on any step, tell me:
1. Which step you're on (2.1, 2.2, etc.)
2. What error you're seeing
3. What line of code you're working on

I'll help you fix it!
