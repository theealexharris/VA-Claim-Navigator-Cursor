# VA Claim Navigator

A comprehensive platform designed to empower veterans in filing VA disability claims. Built with React, Express.js, and Insforge backend.

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- npm or yarn
- Insforge backend account
- Stripe account (for payments)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/theealexharris/VA-Claim-Navigator-Cursor
   cd VA-Claim-Navigator-Cursor
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env` file in the root directory:
   ```env
   # Insforge Configuration
   INSFORGE_API_BASE_URL=https://your-insforge-backend.insforge.app
   INSFORGE_ANON_KEY=your-insforge-anon-key

   # Stripe Configuration
   STRIPE_PUBLISHABLE_KEY=your-stripe-publishable-key
   STRIPE_SECRET_KEY=your-stripe-secret-key

   # Server Configuration
   PORT=5000
   NODE_ENV=development
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

   The application will be available at `http://localhost:5000`

   **If the browser won't connect or the app keeps crashing**, see [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for causes and fixes (port in use, startup errors, white screen).

## 🏗️ Architecture

### Frontend
- **Framework**: React 19 with TypeScript
- **UI**: shadcn/ui (Radix UI) + Tailwind CSS v4
- **State Management**: TanStack React Query + React Context
- **Routing**: Wouter
- **Build**: Vite

### Backend
- **Framework**: Express.js with TypeScript
- **Authentication**: Insforge Auth SDK (token-based)
- **Database**: Insforge Database SDK (PostgreSQL via PostgREST)
- **Storage**: Insforge Storage SDK
- **Payments**: Stripe API

### Database
- **Platform**: Insforge (PostgreSQL)
- **Schema**: Defined in `shared/schema.ts`
- **Tables**: users, service_history, medical_conditions, claims, lay_statements, buddy_statements, documents, appeals, referrals, consultations, site_stats

## 📁 Project Structure

```
├── client/                 # React frontend
│   └── src/
│       ├── components/    # React components
│       ├── contexts/      # React contexts (Auth, etc.)
│       ├── hooks/         # Custom React hooks
│       ├── lib/           # Utilities and API clients
│       └── pages/         # Page components
├── server/                # Express.js backend
│   ├── insforge.ts        # Insforge client configuration
│   ├── insforge-auth.ts   # Authentication service
│   ├── insforge-storage.ts # File storage service
│   ├── insforge-storage-service.ts # Database service
│   └── routes.ts          # API routes
├── shared/                # Shared code (types, schemas)
│   └── schema.ts          # Database schema definitions
└── migrations/            # Database migration scripts
```

## 🔐 Authentication

The application uses Insforge Auth SDK with token-based authentication:

- **Registration**: Creates user account in Insforge
- **Login**: Returns `{user, accessToken}` - token stored in localStorage
- **Protected Routes**: Require `Authorization: Bearer {token}` header
- **Logout**: Clears token from localStorage

## 🗄️ Database

All database operations use Insforge Database SDK. The database schema is defined in `shared/schema.ts` and has been migrated to Insforge.

### Key Tables
- `users` - User accounts and profiles
- `service_history` - Military service records
- `medical_conditions` - Medical conditions
- `claims` - VA disability claims
- `lay_statements` - Personal statements
- `buddy_statements` - Buddy statements
- `documents` - Evidence documents
- `referrals` - Referral program
- `consultations` - Consultation bookings
- `appeals` - Appeals
- `site_stats` - Site statistics

## 📦 Storage

File uploads use Insforge Storage SDK:
- **Bucket**: `uploads` (private, authentication required)
- **Upload**: Files uploaded to Insforge storage
- **Download**: Files served via `/objects/:path` route

## 💳 Payments

Stripe integration for subscription payments:
- Products and prices queried from Stripe API
- Checkout sessions created via Stripe API
- Webhook handling for payment events

## 🧪 Development

### Available Scripts

- `npm run dev` - Start development server (client + API)
- `npm run dev:client` - Start only frontend dev server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run check` - Type check TypeScript

### Environment Variables

See `.env.example` for required environment variables.

## 📚 Documentation

- `NEXT_STEPS.md` - Setup & testing checklist
- `TROUBLESHOOTING.md` - Browser / connection issue guide
- `DEV-SERVER.md` - Development server notes

## 🔄 Migration Status

✅ **Migration Complete** - Backend fully running on Insforge:
- ✅ Authentication (Insforge Auth)
- ✅ Database (Insforge Database SDK)
- ✅ Storage (Insforge Storage SDK)
- ✅ All routes updated
- ✅ Frontend updated for token-based auth
- ✅ Database schema created in Insforge

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

MIT

## 🙏 Acknowledgments

Built to help veterans navigate the VA claims process with confidence and ease.
