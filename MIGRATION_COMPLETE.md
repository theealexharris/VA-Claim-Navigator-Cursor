# Migration to Insforge - COMPLETE ✅

## Summary

The VA Claim Navigator application has been successfully migrated from Replit Native Backend to Insforge backend platform.

## Migration Steps Completed

### ✅ Step 1: Insforge SDK Installation
- Installed `@insforge/sdk` package
- Created `server/insforge.ts` with client configuration
- Set up environment variables for Insforge API

### ✅ Step 2: Storage Migration
- Created `server/insforge-storage.ts` - Insforge storage SDK wrapper
- Replaced Replit object storage with Insforge storage
- Created storage bucket: `uploads` (private)

### ✅ Step 3: Authentication Migration
- Created `server/insforge-auth.ts` - Insforge auth SDK wrapper
- Replaced Passport.js with Insforge auth
- Updated all auth routes (register, login, logout, me)
- Implemented token-based authentication

### ✅ Step 4: Database Migration
- Created `server/insforge-storage-service.ts` - Database operations using Insforge SDK
- Replaced direct Drizzle ORM queries with Insforge database SDK
- Updated all CRUD operations to use Insforge

### ✅ Step 5: Routes Migration
- Updated `server/routes.ts` to use Insforge services
- Replaced all `requireAuth` with `requireInsforgeAuth()`
- Updated all routes to pass `accessToken` for authenticated requests
- Replaced object storage routes with Insforge storage routes

### ✅ Step 6: Frontend Migration
- Created `client/src/lib/api-helpers.ts` - Shared auth utilities
- Updated `client/src/lib/api.ts` to handle Insforge auth tokens
- Updated `client/src/lib/queryClient.ts` to include auth headers
- Updated `client/src/contexts/AuthContext.tsx` for new auth flow
- Updated hooks and pages to use `authFetch` helper

### ✅ Step 7: Database Schema Creation
- Created all 11 database tables in Insforge
- Created all enum types
- Created indexes for performance
- Initialized `site_stats` with default value

### ✅ Step 8: Cleanup
- Removed Replit object storage integration (`server/replit_integrations/`)
- Removed Passport.js dependencies
- Removed session management dependencies
- Updated Stripe client to use environment variables
- Removed unused dependencies from `package.json`

## Removed Dependencies

The following packages have been removed:
- `passport`, `passport-local`
- `bcryptjs`, `@types/bcryptjs`
- `express-session`, `connect-pg-simple`, `@types/connect-pg-simple`, `@types/express-session`
- `@types/passport`, `@types/passport-local`
- `@google-cloud/storage`
- `stripe-replit-sync`
- `@replit/*` vite plugins
- `google-auth-library`
- `memorystore`

## Environment Variables Required

Make sure these are set in your `.env` file:

```env
# Insforge Configuration
INSFORGE_API_BASE_URL=https://2ri79ay3.us-west.insforge.app
INSFORGE_ANON_KEY=your-anon-key-here

# Stripe Configuration
STRIPE_PUBLISHABLE_KEY=your-stripe-publishable-key
STRIPE_SECRET_KEY=your-stripe-secret-key

# Database (for migrations only, not used at runtime)
DATABASE_URL=your-postgresql-connection-string

# Server Configuration
PORT=5000
NODE_ENV=development
```

## Database Tables Created

All tables have been created in Insforge:
- `users`
- `service_history`
- `medical_conditions`
- `claims`
- `lay_statements`
- `buddy_statements`
- `documents`
- `referrals`
- `consultations`
- `appeals`
- `site_stats`

## Storage Bucket Created

- Bucket: `uploads` (private, authentication required)

## Key Changes

### Authentication Flow
- **Before**: Session-based with Passport.js
- **After**: Token-based with Insforge Auth SDK
- Frontend stores `accessToken` in localStorage
- All API requests include `Authorization: Bearer {token}` header

### Database Access
- **Before**: Direct PostgreSQL queries via Drizzle ORM
- **After**: Insforge Database SDK (PostgREST API)

### File Storage
- **Before**: Replit Object Storage (Google Cloud Storage)
- **After**: Insforge Storage SDK

## Next Steps

1. **Set Environment Variables**: Ensure all required env vars are set
2. **Test Authentication**: Try registering and logging in
3. **Test CRUD Operations**: Verify all data operations work
4. **Test File Uploads**: Verify file upload/download functionality
5. **Remove Old Code** (Optional): `server/storage.ts` and `server/db.ts` can be removed if not needed

## Notes

- `server/storage.ts` and `server/db.ts` are kept for reference but are no longer used
- Stripe products/prices now query Stripe API directly instead of database
- The `.replit` file is kept for reference but is deprecated

## Migration Files

- `migrations/create_tables.sql` - SQL migration script
- `MIGRATION_TO_INSFORGE.md` - Detailed migration guide
- `INSFORGE_SETUP.md` - Quick setup guide
- `DEPRECATED_REPLIT.md` - Notes about deprecated Replit code
