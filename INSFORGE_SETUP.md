# Insforge Migration Setup Complete

## ✅ Completed Steps

1. **Installed Insforge SDK** - `@insforge/sdk@latest`
2. **Created Insforge Client** - `server/insforge.ts`
3. **Created Auth Service** - `server/insforge-auth.ts` (replaces Passport.js)
4. **Created Storage Service** - `server/insforge-storage.ts` (replaces Replit object storage)
5. **Created Database Service** - `server/insforge-storage-service.ts` (replaces Drizzle ORM direct queries)
6. **Created Migration Guide** - `MIGRATION_TO_INSFORGE.md`
7. **Created Example Routes** - `server/routes-insforge-example.ts`

## 📋 Next Steps

### 1. Environment Variables

Add to your `.env` file:

```env
INSFORGE_API_BASE_URL=https://2ri79ay3.us-west.insforge.app
INSFORGE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3OC0xMjM0LTU2NzgtOTBhYi1jZGVmMTIzNDU2NzgiLCJlbWFpbCI6ImFub25AaW5zZm9yZ2UuY29tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxODkxNTV9.e0smzSkb8sYydL--CTXCYJMwEKNRujvcL9AAbjDYGfE
```

### 2. Update Routes

Use `server/routes-insforge-example.ts` as a reference to update `server/routes.ts`:

- Replace Passport.js auth with Insforge auth
- Replace `storage` (Drizzle) with `InsforgeStorageService`
- Replace Replit object storage routes with Insforge storage routes
- Update all route handlers to use `requireInsforgeAuth()` middleware

### 3. Update Frontend

Update `client/src/lib/api.ts` to use Insforge SDK for:
- Authentication (sign up, sign in, sign out)
- Database queries (if doing client-side queries)
- File uploads (recommended to do client-side)

### 4. Database Schema Migration

Ensure your Insforge database has the same tables as defined in `shared/schema.ts`. You may need to:
- Run migrations on Insforge database
- Verify table names match (Insforge uses lowercase with underscores)

### 5. Testing

Test each feature:
- [ ] User registration
- [ ] User login
- [ ] Protected routes
- [ ] Database CRUD operations
- [ ] File uploads
- [ ] File downloads

### 6. Cleanup

After migration is complete:
- Remove `server/replit_integrations/` directory
- Remove Passport.js dependencies from `package.json`
- Remove `connect-pg-simple` dependency
- Remove direct `pg` pool usage (if not needed elsewhere)
- Update README.md with Insforge setup instructions

## 📚 Key Files

- **`server/insforge.ts`** - Insforge client configuration
- **`server/insforge-auth.ts`** - Authentication service
- **`server/insforge-storage.ts`** - File storage service
- **`server/insforge-storage-service.ts`** - Database operations service
- **`server/routes-insforge-example.ts`** - Example route implementations
- **`MIGRATION_TO_INSFORGE.md`** - Detailed migration guide

## 🔑 Important Notes

1. **Authentication**: Insforge uses JWT tokens. Store them securely (httpOnly cookies recommended).

2. **Database**: All Insforge database operations return `{data, error}` structure. Always check `error` first.

3. **Storage**: File uploads can be done client-side (recommended) or server-side. Client-side is more efficient.

4. **Error Handling**: Insforge SDK returns structured errors. Handle them appropriately in your routes.

5. **Table Names**: Insforge/PostgREST requires lowercase table names with underscores (e.g., `service_history` not `serviceHistory`).

## 🚀 Quick Start

1. Set environment variables
2. Review `server/routes-insforge-example.ts` for patterns
3. Update `server/routes.ts` route by route
4. Test each route after updating
5. Update frontend to use Insforge SDK
6. Deploy and verify

## 📞 Support

For Insforge-specific questions, refer to:
- Insforge MCP documentation (use `fetch-docs` tool)
- Insforge SDK documentation (use `fetch-sdk-docs` tool)
- Migration guide: `MIGRATION_TO_INSFORGE.md`
