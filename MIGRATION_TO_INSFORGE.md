# Migration Guide: Replit to Insforge

This document outlines the migration from Replit's native backend services to Insforge backend platform.

## Overview

The application was originally built on Replit with:
- **Replit Native Database**: PostgreSQL with Drizzle ORM
- **Replit Native Auth**: Passport.js with bcryptjs
- **Replit Object Storage**: Google Cloud Storage via Replit sidecar

We're migrating to:
- **Insforge Database**: PostgreSQL with Insforge SDK (PostgREST API)
- **Insforge Auth**: Insforge Auth SDK
- **Insforge Storage**: Insforge Storage SDK

## Migration Steps

### 1. Install Insforge SDK

```bash
npm install @insforge/sdk@latest
```

### 2. Environment Variables

Add to your `.env` file:

```env
INSFORGE_API_BASE_URL=https://2ri79ay3.us-west.insforge.app
INSFORGE_ANON_KEY=your-anon-key-here
```

### 3. New Files Created

- `server/insforge.ts` - Insforge client configuration
- `server/insforge-auth.ts` - Auth service using Insforge SDK
- `server/insforge-storage.ts` - Storage service using Insforge SDK
- `server/insforge-storage-service.ts` - Database operations using Insforge SDK

### 4. Authentication Migration

#### Before (Passport.js):
```typescript
// Registration
app.post("/api/auth/register", async (req, res) => {
  const { email, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await storage.createUser({ email, password: hashedPassword });
  // ... session setup
});

// Login
app.post("/api/auth/login", passport.authenticate('local'), (req, res) => {
  res.json({ user: req.user });
});
```

#### After (Insforge):
```typescript
import { registerUser, signInUser, requireInsforgeAuth } from './insforge-auth';

// Registration
app.post("/api/auth/register", async (req, res) => {
  try {
    const { email, password, name } = req.body;
    const result = await registerUser(email, password, name);
    
    if (result?.requireEmailVerification) {
      return res.json({ 
        message: 'Please verify your email',
        requireEmailVerification: true 
      });
    }
    
    res.json({ 
      user: result.user,
      accessToken: result.accessToken 
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Login
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await signInUser(email, password);
    res.json({ 
      user: result.user,
      accessToken: result.accessToken 
    });
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
});

// Protected routes
app.get("/api/profile", requireInsforgeAuth(), async (req, res) => {
  const session = (req as any).insforgeSession;
  res.json({ user: session.user });
});
```

### 5. Database Migration

#### Before (Drizzle ORM):
```typescript
import { db } from './db';
import { users } from '@shared/schema';

const [user] = await db.select().from(users).where(eq(users.id, id));
```

#### After (Insforge SDK):
```typescript
import { insforge } from './insforge';

const { data: user, error } = await insforge.database
  .from('users')
  .select()
  .eq('id', id)
  .single();
```

#### Using InsforgeStorageService:
```typescript
import { InsforgeStorageService } from './insforge-storage-service';

const storage = new InsforgeStorageService();
const user = await storage.getUser(id, accessToken);
```

### 6. Storage Migration

#### Before (Replit Object Storage):
```typescript
import { ObjectStorageService } from './replit_integrations/object_storage';

const storageService = new ObjectStorageService();
const uploadURL = await storageService.getObjectEntityUploadURL();
```

#### After (Insforge Storage):
```typescript
import { insforgeStorage } from './insforge-storage';

// Server-side upload
const { url, key } = await insforgeStorage.uploadFile(file, 'path/to/file.pdf');

// Client-side upload (recommended)
const { data, error } = await insforge.storage
  .from('uploads')
  .upload('documents/file.pdf', fileObject);
```

### 7. Route Handler Updates

All route handlers need to:
1. Extract access token from Authorization header or session
2. Use Insforge services instead of Replit services
3. Handle Insforge error responses

Example:
```typescript
app.post("/api/claims", requireInsforgeAuth(), async (req, res) => {
  try {
    const session = (req as any).insforgeSession;
    const storage = new InsforgeStorageService();
    
    const claim = await storage.createClaim({
      ...req.body,
      userId: session.user.id
    }, session.accessToken);
    
    res.json(claim);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

## Key Differences

### Authentication
- **Replit**: Session-based with Passport.js, cookies
- **Insforge**: Token-based (JWT), can use httpOnly cookies or Authorization header

### Database
- **Replit**: Direct PostgreSQL connection with Drizzle ORM
- **Insforge**: PostgREST API via SDK, returns `{data, error}` structure

### Storage
- **Replit**: Google Cloud Storage via sidecar endpoint
- **Insforge**: Direct upload/download via SDK, simpler API

### Error Handling
- **Replit**: Throws exceptions
- **Insforge**: Returns `{data, error}` - always check error first

## Migration Checklist

- [x] Install Insforge SDK
- [x] Create Insforge client configuration
- [x] Create Insforge auth service
- [x] Create Insforge storage service
- [x] Create Insforge database service
- [ ] Update all auth routes (`/api/auth/*`)
- [ ] Update all database operations in routes
- [ ] Update file upload/download routes
- [ ] Update frontend to use Insforge SDK
- [ ] Remove Replit-specific dependencies
- [ ] Update environment variables
- [ ] Test all functionality
- [ ] Deploy and verify

## Next Steps

1. Update `server/routes.ts` to use Insforge services
2. Update frontend API client to use Insforge SDK
3. Remove Replit-specific code:
   - `server/replit_integrations/` directory
   - Passport.js dependencies
   - Replit object storage code
4. Update `.env` with Insforge credentials
5. Test authentication flow
6. Test database operations
7. Test file uploads/downloads

## Notes

- Insforge uses PostgREST which requires table names to be lowercase with underscores
- All database operations return `{data, error}` structure
- Authentication tokens should be stored securely (httpOnly cookies recommended)
- File uploads can be done client-side or server-side with Insforge SDK
