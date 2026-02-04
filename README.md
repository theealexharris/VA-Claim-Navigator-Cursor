# VA Claim Navigator

A comprehensive full-stack web application designed to empower veterans in filing VA disability claims. The platform simplifies the claims process, ensures accuracy, and maximizes veterans' chances of receiving deserved benefits through guided claim building, AI-powered document generation, and comprehensive tracking tools.

## 🎯 Overview

VA Claim Navigator is a veteran-focused platform that helps users navigate the complex VA disability claims process. It provides intelligent claim building, document management, AI-powered statement generation, appeals tracking, and educational resources—all in one unified platform.

## ✨ Key Features

### 🏗️ Intelligent Claim Builder
- **Guided Claim Process**: Step-by-step wizard to build comprehensive disability claims
- **Service History Management**: Track military service periods and deployments
- **Medical History Tracking**: Document conditions, diagnoses, and service connections
- **Evidence Management**: Upload and organize supporting documentation
- **AI-Powered Memorandum Generation**: Automatically generate legally compliant claim memorandums

### 📝 Document Generation
- **Lay Statement Builder**: Create detailed personal statements about conditions
- **Buddy Statement Coordination**: Generate statements from fellow service members
- **Claim Package PDF Export**: Download complete claim packages for submission

### 📊 Appeals & Tracking
- **Appeals Management**: Track appeal status and deadlines
- **Supplemental Claims Hub**: Manage additional evidence submissions
- **Claim Status Dashboard**: Monitor all active claims in one place

### 🎓 Educational Resources
- **VA Education Library**: Access guides and resources about the claims process
- **TDIU Calculator**: Assess Total Disability Individual Unemployability eligibility
- **Warrior Coach**: AI-powered guidance throughout the claims process

### 👤 User Management
- **User Profiles**: Manage personal information and service details
- **Subscription Management**: Multiple pricing tiers with Stripe integration
- **Referral Program**: Earn credits by referring other veterans
- **Consultation Booking**: Schedule appointments with VA claims experts

## 🛠️ Tech Stack

### Frontend
- **Framework**: React 19 with TypeScript
- **UI Library**: shadcn/ui (built on Radix UI)
- **Styling**: Tailwind CSS v4
- **State Management**: TanStack React Query + React Context
- **Routing**: Wouter
- **Build Tool**: Vite
- **Typography**: Merriweather (headings) + Inter (UI)

### Backend
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Passport.js (Local Strategy) with bcryptjs
- **Validation**: Zod schema validation
- **AI Integration**: OpenAI API for document generation
- **File Storage**: Google Cloud Storage / Object Storage
- **Payments**: Stripe integration

### Development Tools
- **TypeScript**: Type-safe development
- **ESBuild**: Fast bundling
- **Drizzle Kit**: Database migrations
- **Insforge MCP**: Backend platform integration

## 📋 Prerequisites

- **Node.js** 20.x or higher
- **npm** or **yarn**
- **PostgreSQL** 16 or higher
- **Git**

## 🚀 Getting Started

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/theealexharris/VA-Claim-Navigator-Cursor.git
   cd VA-Claim-Navigator-Cursor
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env` file in the root directory with the following variables:
   ```env
   # Database
   DATABASE_URL=postgresql://user:password@localhost:5432/va_claim_navigator
   
   # Session
   SESSION_SECRET=your-session-secret-here
   
   # OpenAI (for AI features)
   OPENAI_API_KEY=your-openai-api-key
   
   # Stripe (for payments)
   STRIPE_SECRET_KEY=your-stripe-secret-key
   STRIPE_PUBLISHABLE_KEY=your-stripe-publishable-key
   
   # Server
   PORT=5000
   NODE_ENV=development
   ```

4. **Set up the database**
   ```bash
   npm run db:push
   ```

### Running the Application

**Development Mode:**

Start the frontend development server:
```bash
npm run dev:client
```

In a separate terminal, start the backend server:
```bash
# Windows PowerShell
$env:NODE_ENV="development"; npm run dev

# Linux/Mac
NODE_ENV=development npm run dev
```

The application will be available at:
- **Frontend**: http://localhost:5000
- **Backend API**: http://localhost:5000/api

**Production Build:**

```bash
npm run build
npm start
```

## 📁 Project Structure

```
VA-Claim-Navigator-Cursor/
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── pages/          # Page components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── contexts/       # React contexts
│   │   └── lib/            # Utility functions
│   └── public/             # Static assets
├── server/                 # Backend Express application
│   ├── routes.ts           # API route definitions
│   ├── storage.ts          # Database operations
│   ├── ai-service.ts      # AI document generation
│   └── replit_integrations/ # Platform integrations
├── shared/                 # Shared code between frontend/backend
│   └── schema.ts           # Database schema definitions
├── script/                 # Build and utility scripts
├── attached_assets/        # Project assets and documents
└── package.json           # Dependencies and scripts
```

## 🔑 Key Features Explained

### AI-Powered Claim Memorandum Generation
The platform uses advanced AI to generate legally compliant claim memorandums by:
- Analyzing user-submitted medical conditions and evidence
- Referencing 38 CFR Part 4 Diagnostic Codes
- Incorporating relevant case law precedents
- Following VA procedures and regulations
- Creating personalized, accurate claim documents

### Service Connection Tracking
- Track multiple service periods
- Document deployments and locations
- Link medical conditions to service periods
- Calculate service connection percentages

### Evidence Management
- Upload multiple document types
- Organize evidence by condition
- Generate evidence lists automatically
- Export complete evidence packages

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Built with care for the veteran community
- Designed to simplify the VA claims process
- Powered by modern web technologies

## 📞 Support

For support, please open an issue in the GitHub repository or contact the development team.

## 🔒 Security

- All passwords are hashed using bcryptjs
- Session-based authentication with secure cookies
- API keys and sensitive data should never be committed to the repository
- Use environment variables for all sensitive configuration

---

**Made with ❤️ for Veterans**
