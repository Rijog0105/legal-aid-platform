# Phase 4 — Camp Management

## Status: 🟡 Implemented — pending local build verification (see "Verification" below)

## Files Created

| File | Purpose |
|---|---|
| `src/features/camps/services/campService.ts` | Supabase CRUD for `camps` (fetchCamps, fetchCamp, createCamp, updateCamp, updateCampStatus, deleteCamp) |
| `src/features/camps/services/campPeopleService.ts` | Supabase CRUD for `camp_people` (fetchCampPeople, assignPersonToCamp, updateCampPersonRole, removePersonFromCamp) |
| `src/features/camps/hooks/useCamps.ts` | List hook — debounced search + status filter |
| `src/features/camps/hooks/useCamp.ts` | Single-camp fetch hook for detail page |
| `src/features/camps/hooks/useCampPeople.ts` | Hook for camp's assigned people |
| `src/features/camps/components/CampForm.tsx` | Create/edit form (Zod + react-hook-form), shared by create page and edit modal |
| `src/features/camps/components/CampListPage.tsx` | Camp cards grid with search + status filter chips |
| `src/features/camps/components/CampCreatePage.tsx` | Full-page camp creation wrapper around `CampForm` |
| `src/features/camps/components/CampDetailPage.tsx` | Tabbed camp detail (Overview, People; Activities/Photos/Budget/Narratives/Report stubbed for later phases), status transition buttons, edit modal |
| `src/features/camps/components/CampPeopleTab.tsx` | Assigned-people table with remove action |
| `src/features/camps/components/AssignPersonModal.tsx` | Search + select a person from the registry, assign with a camp role |
| `src/features/camps/index.ts` | Barrel export (`CampListPage`, `CampCreatePage`, `CampDetailPage`) |

## Files Modified

| File | Change |
|---|---|
| `src/app/routes.tsx` | Replaced Phase 4 placeholder `<div>` stubs for `ROUTES.CAMPS`, `ROUTES.CAMP_CREATE`, `ROUTES.CAMP_DETAIL` with the real pages |
| `docs/PROJECT_CONTEXT.md` | Marked Phase 1–3 complete, Phase 4 as current/next, corrected commit hash |
| `docs/MVP_ROADMAP.md` | Marked Phase 1–3 complete, Phase 4 in progress |

`src/components/layout/Sidebar.tsx` already had a "Camps" nav link pointing at `ROUTES.CAMPS` (added in Phase 1), so no change was needed there.

## Features Implemented

1. **Camp List Page** — search by name, filter by status (draft/active/completed/archived), card grid, empty state, "New Camp" CTA.
2. **Create Camp** — full-page form: name, description, date, start/end time, village/taluk/district, report settings (include_budget, include_survey_stats, max_photos_per_activity). New camps are created with `status: 'draft'` and `created_by` set to the current user's `users.id` (from `useAuth().userId`).
3. **Edit Camp** — same `CampForm` reused inside a modal on the detail page; does not allow editing `status` directly (status changes go through the dedicated transition buttons).
4. **Camp Status Management** — linear transitions enforced in the UI: `draft → active → completed → archived`. Buttons only show the valid next status for the camp's current state.
5. **Camp Detail Page** — header with status badge, date/time/location, tab bar (Overview / People / Activities / Photos / Budget / Narratives / Report). Non-implemented tabs show a "coming in Phase N" placeholder rather than a broken route.
6. **CampPerson Integration** — `CampPeopleTab` lists everyone assigned to the camp with their camp role (Faculty Coordinator / Guest / Volunteer / Team Lead) and category, with a remove action.
7. **Assign People to Camp** — `AssignPersonModal` searches the existing `persons` registry (reusing `peopleService.fetchPeople`), excludes already-assigned people, and lets the user pick a camp role before assigning.
8. **Supabase CRUD** — all operations go through `campService.ts` / `campPeopleService.ts` following the exact pattern established in `peopleService.ts` (plain `supabase.from(...)` calls, RLS-aware, errors thrown as `Error` with `error.message`).

## Schema

No schema changes were made or required. Phase 4 uses the existing `camps` and `camp_people` tables and their columns exactly as defined in `supabase/migrations/001_complete_schema.sql` and typed in `src/types/database.types.ts`.

## Architectural Notes

- Followed the Phase 3 pattern exactly: `service → hook → page/component`, feature-scoped folders (`services/`, `hooks/`, `components/`), barrel export via `index.ts`.
- `CampForm` is intentionally UI-chrome-free (no modal wrapper baked in) so it can be reused both as a full-page section (`CampCreatePage`) and inside a modal (`CampDetailPage` edit).
- Status transitions use a `STATUS_FLOW` lookup table rather than a free-form status `<select>`, to keep the `draft → active → completed → archived` lifecycle enforced at the UI level (RLS/DB policies remain the source of truth for what's actually permitted).

## Verification

⚠️ **This environment only has file read/write access to your local repository (via the filesystem MCP server) — it does not have a terminal/shell on `C:\Users\PC\...`.** I was not able to run `npx tsc --noEmit`, `npm run build`, or any `git` command locally, so these still need to be run and confirmed by you:

```bash
cd C:\Users\PC\Documents\GitHub\legal-aid-camp-platform
npx tsc --noEmit
npm run build
```

If either command reports errors, share the output and I'll fix them directly in the source files.

### Committing

I also do not have git execution access, so no commit was made. Suggested commit (local only, per your instructions — no push, no PR):

```bash
git add .
git commit -m "Phase 4 - Camp Management"
```

## Remaining Work — Phase 5 (Activity Management)

- `ActivityService` — CRUD + reorder operations for `activities` table
- `ActivitiesTab` — activity list component inside `CampDetailPage` (currently a placeholder)
- `ActivityForm` — create/edit with predefined suggestions (`PREDEFINED_ACTIVITIES` already defined in `constants/index.ts`)
- Drag-and-drop reorder via `@dnd-kit` (already a project dependency, unused so far)
- `activityStore` — active-activity context for volunteer photo capture (Phase 6 dependency)
- Activity status transitions: `planned → active → completed`
- Cascade delete of associated photos when an activity is deleted
