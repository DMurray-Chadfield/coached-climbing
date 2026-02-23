# AI Climbing Coach

## Overview
An AI-powered climbing coaching application that creates personalized training plans. Users complete an onboarding questionnaire, and the app generates structured week-by-week training plans using AI (OpenAI). Users can chat with the coach to adjust plans and track completion.

## Recent Changes
- 2026-02-23: Added progress metrics feature
  - MetricDefinition and MetricEntry database models with Prisma migration
  - API routes for metrics CRUD: list, create, delete definitions; add, list, delete entries
  - MetricsPanel dashboard component with latest values, history, BW% calculations, custom metric creation
  - Default metrics (Body Weight, Finger Strength, Weighted Pull-ups) auto-seeded for new users
  - Metrics integrated into AI coach context (plan generation and chat) so coach references user data
- 2026-02-23: Initial Replit environment setup from GitHub import
- Configured Next.js for Replit (port 5000, allowed dev origins)
- Set up PostgreSQL database with Prisma migrations
- Integrated Replit AI integrations for OpenAI access

## Project Architecture
- **Framework**: Next.js 14 (App Router) with TypeScript
- **Database**: PostgreSQL via Prisma ORM
- **Auth**: NextAuth.js with credentials provider (username/email + password)
- **AI**: OpenAI via Replit AI Integrations
- **Package Manager**: pnpm
- **Styling**: CSS (globals.css)

### Key Directories
- `src/app/` - Next.js app router pages and API routes
- `src/components/` - React components
- `src/lib/` - Core library code (auth, env, prisma, services)
- `src/lib/services/llm/` - LLM provider abstraction (OpenAI, Gemini)
- `prisma/` - Database schema and migrations
- `plan/` - Project planning docs
- `docs/` - Additional documentation

### Environment Variables
- `DATABASE_URL` - PostgreSQL connection string (auto-configured)
- `NEXTAUTH_URL` - Base URL for NextAuth
- `NEXTAUTH_SECRET` - Secret for JWT signing
- `LLM_PROVIDER` - "openai" or "gemini"
- `OPENAI_MODEL_PRIMARY` - Model name (e.g., gpt-4o-mini)
- `AI_INTEGRATIONS_OPENAI_API_KEY` - Replit AI integration key (auto-configured)
- `AI_INTEGRATIONS_OPENAI_BASE_URL` - Replit AI integration base URL (auto-configured)

## User Preferences
- None recorded yet
