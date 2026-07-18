# Project Context — AI & Developer Handover Document

> This document provides everything a new developer or AI agent needs to resume work on this project without reverse-engineering the codebase. Read this first.

---

## Repository

| Field | Value |
|-------|-------|
| **Organization** | CivicForgeLabs |
| **Repository** | legal-aid-camp-platform |
| **URL** | https://github.com/CivicForgeLabs/legal-aid-camp-platform |
| **Default Branch** | `main` |
| **Visibility** | Organization repository |

---

## Current Status

| Field | Value |
|-------|-------|
| **Current Phase** | Phase 6 — Photo Documentation |
| **Last Completed Phase** | Phase 5 — Activity Management |
| **Latest Commit** | `9a4512c7b88fc985b44a7234674fc1b35b6d5971` |
| **Build Status** | ✅ Verified — `npx tsc --noEmit` and `npm run build` both pass |

---

## Completed Work (Phase 1)

### Configuration
- Vite 8 + React 19 + TypeScript 6 (strict mode)
- Tailwind CSS v4 with `@tailwindcss/vite` plugin
- Path aliases: `@/` → `src/`
- Environment: `.env` with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`

### Database Schema (Supabase/PostgreSQL)
- **11 tables**: roles, persons, users, camps, camp_people, activities, photos, surveys, expenses, narrative_sections, reports
- **Indexes** on all foreign keys and common query columns
- **Row Level Security** enabled on all tables
- **Helper functions**: `get_user_role()`, `get_app_user_id()`
- **RLS policies** for all CRUD operations per role
- **Migration file**: `supabase/migrations/001_complete_schema.sql`
- **Seed data**: `supabase/seed.sql`

### Authentication Foundation
- `authService.ts` — Supabase Auth wrapper (signIn, signUp, signOut, getProfile)
- `authStore.ts` — Zustand store with user, role, session state
- `useAuth.ts` — Hook with `onAuthStateChange` listener, role resolution, login/logout

### UI Components (shared)
- `Button` — 5 variants (primary, secondary, outline, ghost, danger), 3 sizes, loading state, icon support
- `Input` — Label, error message, helper text, forwardRef
- `Card` — Padding variants (sm, md, lg, none), hover effect, sub-components (Header, Footer)
- `Badge` — Status-specific variants for camps, activities, reports
- `Spinner` / `PageLoader` — Loading states
- `EmptyState` — Empty list illustration with action button

### Layouts
- `AppShell` — Collapsible sidebar + scrollable content area (faculty/admin/team_lead)
- `Sidebar` — Dark theme, navigation links, user info, collapse toggle
- `VolunteerLayout` — Glass top bar + bottom navigation tabs (volunteer)

### Routing
- React Router v7 with `createBrowserRouter`
- `ProtectedRoute` guard — checks auth + role
- Route groups: Faculty routes (sidebar layout), Volunteer routes (mobile layout)
- Routes defined in `src/constants/index.ts` → `ROUTES`

### Pages
- `LoginPage` — Split-panel design, form validation with Zod
- `DashboardPage` — Gradient action cards, placeholder stats
- `UnauthorizedPage` — 403 with navigation
- `VolunteerHomePage` — Activity banner, quick actions

### Constants & Types
- `ROLES`, `CAMP_STATUS`, `ACTIVITY_STATUS`, `REPORT_STATUS` — typed enums
- `CAMP_ROLE`, `PERSON_CATEGORY`, `NARRATIVE_SECTION_TYPE` — domain enums
- `PREDEFINED_ACTIVITIES` — standard activity templates
- `APP_CONFIG` — app-wide configuration
- `ROUTES` — all route paths
- `database.types.ts` — TypeScript interfaces for all 11 entities + composite types

---

## Completed Work (Phase 2)

- LoginPage wired to Supabase Auth (`signInWithPassword`), Zod + react-hook-form validation
- Session persistence via Supabase `localStorage` session + `onAuthStateChange` listener
- `RootRedirect` + role-based redirect (volunteer → `/volunteer`, others → `/dashboard`)
- `ProtectedRoute` role guard, `/unauthorized` redirect for wrong-role access
- Full auth error handling (invalid credentials, unconfirmed email, network errors, expired session)
- See `docs/PHASE_02_AUTH.md` for full details

## Completed Work (Phase 3)

- `peopleService.ts` — Supabase CRUD (fetchPeople, fetchPerson, createPerson, updatePerson, deletePerson)
- `usePeople` hook — debounced search + category filter
- `PeoplePage` — searchable/filterable table with edit/delete
- `PersonForm` — create/edit modal with Zod validation
- `/people` route wired into AppShell
- See `docs/PHASE_03_PEOPLE.md` for full details

## Completed Work (Phase 4)

- `campService.ts` / `campPeopleService.ts` — Supabase CRUD for camps and camp_people
- `CampListPage`, `CampCreatePage`, `CampDetailPage`, `CampPeopleTab`, `AssignPersonModal`, `CampForm`
- Status transitions: draft → active → completed → archived
- People assignment to camps with camp roles
- TypeScript verification and production build confirmed passing
- Supabase project created; `001_complete_schema.sql` executed; database tables and roles confirmed
- Frontend connects to Supabase; login page confirmed reaching Supabase Auth
- See `docs/PHASE_04_CAMPS.md` for full details

## Completed Work (Phase 5)

**Status:** ✅ Complete — Milestones A and B (see `docs/PHASE_05_ACTIVITY_MANAGEMENT.md`)

**Milestone A — Activity CRUD**
- `activityService.ts` — Supabase CRUD for `activities` (fetchActivities, fetchActivity, createActivity, updateActivity, deleteActivity, getNextActivityOrder)
- `useActivities` hook — fetch/reload activities for a camp, ordered by `activity_order`
- `ActivityForm`, `ActivityListItem`, `ActivitiesTab` — create/edit/delete activities within the camp detail page
- `ActivitiesTab` wired into `CampDetailPage`'s Activities tab

**Milestone B — Reordering, Status Workflow, Form UX**
- `activityService.ts` extended with `updateActivityStatus(id, status)` and `reorderActivities(campId, orderedIds)`
- `useActivities` now exposes `setActivities` for optimistic local updates
- Drag-and-drop reordering — `ActivityListItem` is a `@dnd-kit/sortable` row with a drag handle; `ActivitiesTab` wraps the list in `DndContext`/`SortableContext` and persists the new `activity_order` on drop
- Activity status workflow — `planned → active → completed`, one "Mark {status}" action per row (mirrors the `CampStatus` transition pattern in `CampDetailPage`)
- `ActivityForm` UX improved — the predefined-activity `datalist` was replaced with a `<select>` dropdown (`PREDEFINED_ACTIVITIES` + an "Other / Custom Activity" option); choosing "Other" reveals a custom-name text input, validated with Zod
- No schema, migration, or RLS changes were required for either milestone
- See `docs/PHASE_05_ACTIVITY_MANAGEMENT.md` for full details

## Pending Work (Next Phases)

### Phase 6 — Photo Documentation (Current)
- Volunteer photo capture (mobile camera)
- Upload to Supabase Storage
- Faculty photo review gallery
- Report photo selection
- Volunteer Dashboard (mobile activity selector, upload queue, own submissions)
- `activityStore` (Zustand) for active-activity context during capture

### Phase 7 — Budget & Narrative Sections
- Expense line items with auto-totals
- 5 narrative section editors with auto-save

### Phase 8 — Report Generation ⭐ (Flagship)
- Assemble all camp data into CampReportData
- In-browser report preview
- PDF generation (jsPDF + html2canvas)
- DOCX generation (docxtemplater)
- Report versioning and storage

### Phase 9 — Dashboard & Polish
- Live statistics dashboard (Dashboard currently shows placeholder stats only)
- Automatic camp status transitions (Scheduled → Expired / Completed) — camp status is currently faculty-triggered only; no scheduled/automatic transition logic exists yet
- Role-based navigation/UI — sidebar and route groups currently split faculty-vs-volunteer only; finer-grained per-role UI (e.g. team_lead-specific views) is not yet implemented
- Error boundaries, loading states
- Code splitting, performance optimization
- Deployment readiness

---

## Current Architecture

- **Pattern:** `service → hook → component`, repeated per feature module. Each feature under `src/features/<name>/` owns its own `services/`, `hooks/`, and `components/`, plus a barrel `index.ts`.
- **Feature modules implemented so far:** `auth`, `people`, `camps` (includes the People tab, status transitions), `activities` (new in Phase 5 — CRUD, drag-and-drop reorder, status workflow, form with predefined/custom activity selection).
- **Shared UI primitives** (`src/components/ui/`): `Button`, `Input`, `Card`, `Badge` (with camp/activity status variants), `Spinner`, `EmptyState` — reused by every feature module, including `activities`.
- **State:** Zustand only where needed (`authStore`); most feature state lives in local hooks (`usePeople`, `useCamp`, `useActivities`) rather than a global store. No `activityStore` yet — deferred to Phase 6.
- **Data layer:** Supabase client (`src/services/supabase.ts`) accessed directly from feature services — no repository/ORM abstraction layer.
- **Drag-and-drop:** `@dnd-kit/core` + `@dnd-kit/sortable` + `@dnd-kit/utilities`, first used in Phase 5 for activity reordering; no other feature uses it yet.
- **Routing:** React Router v7, faculty routes under the sidebar `AppShell`, volunteer routes under `VolunteerLayout`; `activities` has no dedicated route — it's a tab within `CampDetailPage`, consistent with `people` (via `CampPeopleTab`).

---

## Current Feature Status

| Module | Status | Notes |
|---|---|---|
| Auth (login, session, role-based redirect) | ✅ Working | Phase 2 |
| People registry (create, edit, list, search, filter) | ⚠️ Partial | Create/edit/list/search/filter all work. **Delete is broken — see Known Bugs.** |
| Camp management (create, edit, list, status transitions) | ✅ Working | Status transitions are manual (faculty-triggered); no automatic expiry — see Deferred Issues |
| Camp People tab (assign/remove people to a camp) | ✅ Working | Phase 4 |
| Activities (CRUD, reorder, status workflow) | ✅ Working | Phase 5, Milestones A + B complete |
| Photos, Surveys, Expenses, Narratives, Reports | 🔲 Not started | Phases 6–8 |
| Dashboard statistics | 🔲 Not started | Placeholder cards only, no live queries |
| Volunteer Dashboard | 🔲 Not started | Phase 6 |
| Role-based navigation/UI (beyond faculty/volunteer split) | 🔲 Not started | See Deferred Issues |

---

## Current Database Status

- Schema: `supabase/migrations/001_complete_schema.sql` — 11 tables (roles, persons, users, camps, camp_people, activities, photos, surveys, expenses, narrative_sections, reports), unchanged since Phase 1
- RLS enabled on all tables; helper functions `get_user_role()` / `get_app_user_id()` in place
- `activities` table (used by Phase 5) required no schema, migration, or RLS changes — `status` continues to use the existing `planned | active | completed` check constraint
- No Storage buckets configured yet (`camp-photos`, `camp-reports` are required for Phase 6 and Phase 8 respectively, not yet created)
- No new tables, columns, or migrations have been added since Phase 1's initial schema

---

## Deferred Issues

| Issue | Target Phase |
|---|---|
| Photo capture, upload, and review | Phase 6 |
| Volunteer Dashboard | Phase 6 |
| `activityStore` (Zustand active-activity context for volunteer capture) | Phase 6 |
| Survey forms / survey analytics | Out of scope — this platform only stores survey reference IDs and aggregate stats, per the "not a survey platform" project rule |
| Budget and narrative sections | Phase 7 |
| Report generation (PDF/DOCX) | Phase 8 |
| Dashboard statistics (live counts, recent activity feed, completion indicators) | Phase 9 |
| Automatic Camp Status transitions (Scheduled → Expired / Completed) | Phase 9 |
| Role-based navigation/UI beyond the current faculty/volunteer layout split | Phase 9 |
| Error boundaries, skeleton loading states, code splitting | Phase 9 |

---

## Known Bugs

| Bug | Area | Details |
|---|---|---|
| People deletion does not remove the person | People registry (`peopleService.ts` / `PeoplePage`) | The delete confirmation dialog appears and can be confirmed, but the underlying person record is not actually removed. Needs investigation before Phase 5 work is considered fully closed out from a QA standpoint. Not fixed as part of this documentation pass — implementation code was intentionally left untouched. |

---

## Critical Rules

> These rules are non-negotiable. Violating them will break the project's architecture.

### 1. Camp is the primary entity
Everything exists in relation to a camp. Activities, photos, expenses, narratives, people assignments, surveys, and reports are all children of a camp. Never create an orphaned entity.

### 2. This is NOT a survey platform
Survey collection and analytics are handled by a separate system. This platform only stores survey reference IDs (`survey_reference_id`) and aggregate stats for inclusion in reports. Do not build survey forms, survey analytics, or survey management.

### 3. Report generation is the flagship feature
All other features exist to feed data into the automated report generator. Every design decision should ask: "Does this make report generation better?" The report is the primary output of the system.

### 4. Enter Once → Use Everywhere
No data should be entered twice. A person's name, an activity, a photo — each is entered once and automatically flows into all relevant views and the final report.

### 5. Inspect repository before coding
Before writing any code, always check the current state of the repository. Do not assume file contents. Read the latest commit, check existing files, and understand what has been built.

### 6. Do not regenerate existing code
Never rewrite files that already exist and work correctly. Extend, modify, or import — but do not replace working code without cause.

### 7. Continue from the latest commit
Always start from the latest commit on `main`. Pull before coding. Never create work that conflicts with existing code.

### 8. Types are the source of truth
`src/types/database.types.ts` mirrors the PostgreSQL schema exactly. All feature-level types must extend or pick from these base types. Never define a separate type that contradicts the database schema.

### 9. Constants are centralized
All enums, statuses, routes, and configuration are defined in `src/constants/index.ts`. Do not hardcode strings that should be constants.

### 10. Feature modules are self-contained
Each feature in `src/features/` has its own `components/`, `hooks/`, `services/`, and optionally `types/`. Cross-feature imports go through barrel exports or shared modules.

---

## Architectural Decisions

| Decision | Rationale |
|----------|-----------|
| Supabase, not custom API | Auth + DB + Storage + RLS in one service. No backend to build. |
| Client-side report gen | No server rendering. jsPDF + html2canvas runs in browser. |
| Zustand, not Redux | Minimal state needs: auth, active camp context, UI. No server cache. |
| Feature-based folders | Self-contained modules prevent coupling. Easy to add features. |
| Separate persons and users | Not all people in reports are system users. Guests don't log in. |
| Two separate layouts | Faculty = sidebar + desktop. Volunteer = mobile + bottom nav. |
| RLS helper functions | `get_user_role()` / `get_app_user_id()` avoid repeated auth joins. |
| JSONB report_settings | Flexible per-camp config without schema migration. |
| TypeScript strict mode | `noUnusedLocals` + `noUnusedParameters` catch issues early. |
| Tailwind CSS v4 | New `@theme` directive, Vite plugin (no PostCSS config). |

---

## Technology Stack Reference

| Layer | Package | Version |
|-------|---------|---------|
| Framework | react | 19.2.7 |
| Language | typescript | 6.0.2 |
| Build | vite | 8.1.1 |
| Styling | tailwindcss | 4.3.2 |
| State | zustand | 5.0.14 |
| Forms | react-hook-form | 7.81.0 |
| Validation | zod | 4.4.3 |
| Routing | react-router-dom | 7.18.1 |
| Backend | @supabase/supabase-js | 2.110.2 |
| PDF | jspdf | 4.2.1 |
| Canvas | html2canvas | 1.4.1 |
| DOCX | docxtemplater | 3.69.0 |
| Zip | pizzip | 3.2.0 |
| Icons | lucide-react | 1.24.0 |
| DnD | @dnd-kit/core | 6.3.1 |
| DnD | @dnd-kit/sortable | 10.0.0 |
| DnD | @dnd-kit/utilities | 3.2.2 |
| Dates | date-fns | 4.4.0 |

---

## File Map

```
legal-aid-camp-platform/
├── docs/
│   ├── PHASE_01_SETUP.md          # Phase 1 completion notes
│   ├── PROJECT_BLUEPRINT.md       # Master specification
│   ├── MVP_ROADMAP.md             # Implementation roadmap
│   └── PROJECT_CONTEXT.md         # This file
├── supabase/
│   ├── migrations/
│   │   └── 001_complete_schema.sql # Full database schema
│   └── seed.sql                    # Demo data
├── src/
│   ├── app/
│   │   ├── App.tsx                 # Root component (auth init)
│   │   └── routes.tsx              # Router configuration
│   ├── components/
│   │   ├── guards/ProtectedRoute.tsx
│   │   ├── layout/                 # AppShell, Sidebar, VolunteerLayout
│   │   └── ui/                     # Button, Input, Card, Badge, Spinner, EmptyState
│   ├── constants/index.ts          # All enums, statuses, routes, config
│   ├── features/auth/              # Auth service, hook, LoginPage
│   ├── features/people/            # People registry (service, hook, list, form)
│   ├── features/camps/             # Camp management (service, hooks, list/create/detail, people tab)
│   ├── features/activities/        # Activity management (service, hook, form, list item, tab) — Phase 5
│   ├── pages/                      # Dashboard, Unauthorized, VolunteerHome
│   ├── services/supabase.ts        # Supabase client
│   ├── store/authStore.ts          # Zustand auth store
│   ├── types/database.types.ts     # Database entity types (source of truth)
│   └── utils/index.ts              # Formatters, helpers
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## How to Resume Work

```bash
# 1. Clone and install
git clone https://github.com/CivicForgeLabs/legal-aid-camp-platform.git
cd legal-aid-camp-platform
npm install

# 2. Configure environment
cp .env.example .env
# Add Supabase URL and anon key

# 3. Verify build
npx tsc --noEmit
npm run build

# 4. Start dev server
npm run dev

# 5. Read docs in this order
#    → docs/PROJECT_CONTEXT.md (this file)
#    → docs/PROJECT_BLUEPRINT.md (full spec)
#    → docs/MVP_ROADMAP.md (what to build next)
```

---

## Contacts

| Role | GitHub Handle |
|------|--------------|
| Admin/Owner | @Dhanush051104 |
| Admin/Owner | @Rijog0105 |


---
