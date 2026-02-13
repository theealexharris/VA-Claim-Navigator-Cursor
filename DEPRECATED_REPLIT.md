# Replit Configuration (Deprecated)

This project has been migrated from Replit to Insforge backend.

The `.replit` file is kept for reference but is no longer used.

## Migration Notes

- **Backend**: Migrated from Replit Native Backend to Insforge
- **Authentication**: Migrated from Passport.js to Insforge Auth SDK
- **Database**: Migrated from direct PostgreSQL to Insforge Database SDK
- **Storage**: Migrated from Replit Object Storage to Insforge Storage SDK

## Environment Variables Required

Make sure to set these environment variables:

- `INSFORGE_API_BASE_URL` - Your Insforge backend URL
- `INSFORGE_ANON_KEY` - Your Insforge anonymous key
- `STRIPE_PUBLISHABLE_KEY` - Stripe publishable key
- `STRIPE_SECRET_KEY` - Stripe secret key
- `DATABASE_URL` - PostgreSQL connection string (for migrations only, not used for runtime)

## Removed Dependencies

The following dependencies have been removed:
- `passport`, `passport-local`
- `bcryptjs`
- `express-session`, `connect-pg-simple`
- `@google-cloud/storage`
- `stripe-replit-sync`
- `@replit/*` vite plugins
