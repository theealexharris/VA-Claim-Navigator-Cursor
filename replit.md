# VA Claim Navigator

## Overview

VA Claim Navigator is a full-stack web application designed to empower veterans in filing VA disability claims. It offers guided claim building, document management, AI-powered lay statement generation, buddy statement coordination, appeals tracking, TDIU eligibility assessment, and an AI coaching feature. The platform aims to simplify the claims process, ensure accuracy, and maximize veterans' chances of receiving deserved benefits. It uses a monorepo structure with a React frontend and an Express.js backend, backed by PostgreSQL.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React 18 with TypeScript
- **UI**: shadcn/ui (built on Radix UI) and Tailwind CSS v4 with a navy/gold color scheme.
- **State Management**: TanStack React Query for server state, React Context for authentication.
- **Routing**: Wouter.
- **Typography**: Merriweather (headings) and Inter (UI).
- **Build**: Vite.

### Backend
- **Framework**: Express.js with TypeScript.
- **API**: RESTful endpoints.
- **Authentication**: Passport.js (Local Strategy, session-based with `express-session`) and `bcryptjs` for password hashing.
- **Database ORM**: Drizzle ORM with PostgreSQL.
- **Validation**: Zod for schema validation.

### Data Storage
- **Database**: PostgreSQL (`DATABASE_URL`).
- **Schema**: Defined in `shared/schema.ts`.
- **Key Tables**: `users`, `serviceHistory`, `medicalConditions`, `claims`, `layStatements`, `buddyStatements`, `documents`, `appeals`, `referrals`, `consultations`.

### AI Deep Dive Analysis System
The claim memorandum generation uses an AI-powered system integrating:
- **38 CFR Part 4 Diagnostic Code Database**: Comprehensive reference for VA rating categories.
- **Case Law Precedent Database**: Includes rulings like Shedden v. Principi, DeLuca v. Brown, Gilbert v. Derwinski, Walker v. Shinseki, and Layno v. Brown.
- **VA Procedures Reference**: Covers 38 CFR § 3.303, § 3.310, § 4.40, § 4.45, § 4.59, PACT Act provisions, and the benefit of the doubt standard.
- **Processing Flow**: Categorizes evidence, cross-references with claimed conditions, identifies diagnostic codes, selects case law, and generates a comprehensive memorandum with legal citations using a GPT-4o model.

### UI/UX Standards
- **Color Scheme**: Deep Navy Blue (`#1e3a8f`) and Muted Gold (`#cdad5e`).
- **Typography**: Merriweather (serif) for headings, Inter (sans-serif) for body/UI.
- **Dashboard Layout**: Fixed left sidebar, main content area, header, and collapsible hamburger menu for mobile.
- **Guided Workflow**: Enforced progression: Personal Information → Service History → Medical Conditions → Claim Builder.
- **Claim Builder Steps**: Conditions Selection, Personal Information Review, Service History Review, Evidence Upload, Review & Generate.
- **Dialogs**: Radix UI Dialog primitives via shadcn/ui for warnings, info, and confirmations.
- **Permanent Text/Format**: Specific subject lines, PACT Act text, VA Contact Information page, justified paragraph formatting, and bold/underlined headings are mandatory and not to be altered.
- **Phone Formatting**: All phone fields use `(123) 456-7890` format.

### Pricing & Payments
- **Tiers**: Starter (Free), Pro (Free with promo code), Deluxe ($499), Business (Custom).
- **Promo Code**: `VACLAIMNAVIGATORPROMO` for 100% off Pro/Deluxe.
- **Stripe Integration**: Handles payment processing, updates `userProfile.subscriptionTier` upon success.
- **Admin Access**: Admin users bypass subscription restrictions.

## External Dependencies

### Database
- **PostgreSQL**: Primary data store.
- **Drizzle Kit**: For database migrations.

### Authentication & Security
- **Passport.js**: Authentication middleware.
- **bcryptjs**: Password hashing.
- **express-session**: Session management.

### UI/UX Libraries
- **Radix UI**: Accessible UI primitives.
- **shadcn/ui**: Component library.
- **Lucide React**: Icon library.
- **Framer Motion**: Animations.
- **date-fns**: Date manipulation.

### Development & Build Tools
- **Vite**: Frontend build and dev server.
- **esbuild**: Backend bundling.
- **TypeScript**: For type safety.
- **Tailwind CSS**: Utility-first styling.

### Environment Variables
- `DATABASE_URL`: PostgreSQL connection string.
- `SESSION_SECRET`: Session encryption key.
- `STRIPE_WEBHOOK_SECRET`: Stripe webhook signing secret.

### Email Integration
- Placeholder exists for email sending (e.g., Resend or SendGrid) to `Frontdesk@vaclaimnavigator.com`, `Billing@vaclaimnavigator.com`, and `vaclaimnavigatorcontact@gmail.com`.

## Claim Memorandum Generation Rules (DO NOT ALTER)

### No-Evidence Supporting Citation Text (PERMANENT)
When NO evidence is uploaded in the Evidence step, the AI memorandum generator MUST use this EXACT text for ALL "SUPPORTING EVIDENCE CITATIONS:" sections:

"Please note that medical records and supporting documentation are not attached to this claim at this time. I am actively gathering evidence that will substantiate the claims made herein, including: Service Treatment Records documenting relevant medical complaints during active duty; VA medical records containing diagnostic test results that confirm the presence and progression of my condition; private medical records from specialists detailing my ongoing symptoms, formal diagnoses, and prescribed treatment plans; and lay statements from family members and myself establishing the continuity and severity of symptoms since military service. These materials will be submitted at a later date. While a formal nexus opinion may not yet be included, the cumulative evidence will demonstrate a clear connection between my military service and my current disability."

- This text must appear verbatim with no modifications
- No additional statements should be added when no evidence is uploaded
- Located in: `server/ai-service.ts` (generateClaimMemorandum function)

### Evidence-Specific Citation Rules
When evidence IS uploaded, the AI memorandum generator MUST only reference evidence types that were actually submitted:
- If NO nexus letter uploaded: DO NOT mention nexus letters, nexus opinions, or treating psychologist/physician nexus statements
- If NO buddy statement uploaded: DO NOT mention buddy statements
- Only reference evidence types that exist in the submitted evidence list
- Located in: `server/ai-service.ts` (hasNexusLetter, hasBuddyStatement checks)

## Upgrade Popup Prevention Framework (CRITICAL - DO NOT ALTER)

### Overview
The upgrade dialog/popup must NEVER appear during promotional periods when `PROMO_ACTIVE = true`. This is a recurring issue that has been resolved with a 3-layer bulletproof protection system.

### Centralized PROMO_ACTIVE Constant
- **Single Source of Truth**: `client/src/hooks/use-subscription.ts`
- **Export**: `export const PROMO_ACTIVE = true;`
- **Usage**: Import from this hook in ALL components that need promo checking
- **DO NOT** define PROMO_ACTIVE locally in components - always import from the hook

### 3-Layer Protection System (ClaimBuilder.tsx)

**Layer 1: Safe Trigger Function**
```typescript
const safeShowUpgradeDialog = () => {
  if (PROMO_ACTIVE) {
    console.log("Promo active - upgrade dialog blocked");
    return;
  }
  if (isPaidTier) {
    return;
  }
  setShowUpgradeDialog(true);
};
```
- ALL calls to show upgrade dialog MUST use `safeShowUpgradeDialog()` 
- NEVER call `setShowUpgradeDialog(true)` directly

**Layer 2: Force-Close useEffect**
```typescript
useEffect(() => {
  if (PROMO_ACTIVE && showUpgradeDialog) {
    setShowUpgradeDialog(false);
  }
}, [showUpgradeDialog]);
```
- Safety net that force-closes dialog if accidentally opened during promo

**Layer 3: Conditional Rendering**
```typescript
{!PROMO_ACTIVE && (
  <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
    ...
  </Dialog>
)}
```
- Dialog component is NOT RENDERED AT ALL during promo period
- Even if state is somehow set to true, nothing will display

### Files Affected
- `client/src/hooks/use-subscription.ts` - Central PROMO_ACTIVE definition
- `client/src/pages/ClaimBuilder.tsx` - Primary upgrade dialog with 3-layer protection
- `client/src/pages/Settings.tsx` - Imports PROMO_ACTIVE from hook

### isPaidTier Calculation
```typescript
const isPaidTier = 
  import.meta.env.DEV || 
  subscriptionTier !== "starter" || 
  isAdmin || 
  PROMO_ACTIVE;
```
- During promo, ALL users are considered paid tier
- This bypasses all tier-gated features

### User Counter System
- Counter increments when new users register
- Located in: `server/routes.ts` (register endpoint calls `storage.incrementStat("vets_served")`)
- Stats stored in database via `storage.getStat()` and `storage.initializeStat()`