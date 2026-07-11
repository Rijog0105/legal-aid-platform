# Legal Aid Camp Documentation & Report Automation Platform

> Reduce administrative effort in camp documentation and automate institutional report generation.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 · TypeScript · Vite · Tailwind CSS v4 |
| State | Zustand |
| Forms | React Hook Form + Zod |
| Backend | Supabase (PostgreSQL, Auth, Storage, RLS) |
| Report Gen | docxtemplater · jsPDF · html2canvas |

## Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/CivicForgeLabs/legal-aid-camp-platform.git
cd legal-aid-camp-platform

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Edit .env with your Supabase project URL and anon key

# 4. Set up database
# Run supabase/migrations/001_complete_schema.sql in your Supabase SQL editor

# 5. Start development server
npm run dev
```

## Project Structure

```
src/
├── app/              # App root, router, providers
├── components/       # Shared UI components & layout
│   ├── ui/           # Button, Input, Card, Badge, etc.
│   ├── layout/       # AppShell, Sidebar, VolunteerLayout
│   └── guards/       # ProtectedRoute
├── features/         # Feature modules
│   ├── auth/         # Authentication
│   ├── camp/         # Camp management
│   ├── activity/     # Activity management
│   ├── photo/        # Photo documentation
│   ├── budget/       # Expense tracking
│   ├── narrative/    # Narrative sections
│   ├── report/       # Report generation
│   └── dashboard/    # Statistics dashboard
├── services/         # Supabase client
├── store/            # Zustand stores
├── types/            # TypeScript type definitions
├── utils/            # Helper functions
└── constants/        # App constants & enums
```

## User Roles

| Role | Access |
|------|--------|
| Faculty | Full camp management, report generation |
| Team Lead | Activity monitoring, documentation review |
| Volunteer | Photo capture, form submission |

## Development Phases

- [x] Phase 1: Project Setup, Auth, Database Schema
- [ ] Phase 2: Authentication & Protected Routes
- [ ] Phase 3: Database Integration
- [ ] Phase 4: Camp Management
- [ ] Phase 5: Activity Management
- [ ] Phase 6: Photo Documentation
- [ ] Phase 7: Narrative Sections
- [ ] Phase 8: Report Generation ⭐
- [ ] Phase 9: Dashboard & QA

## License

MIT
