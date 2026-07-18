# Phase 5 — Activity Management

## Status: ✅ Complete (Milestone A — MVP CRUD)

## Files Created

| File | Purpose |
|---|---|
| `src/features/activities/services/activityService.ts` | Supabase CRUD for `activities` (fetchActivities, fetchActivity, createActivity, updateActivity, deleteActivity) plus `getNextActivityOrder` helper |
| `src/features/activities/hooks/useActivities.ts` | List hook — fetches and reloads a camp's activities, ordered by `activity_order` |
| `src/features/activities/components/ActivityForm.tsx` | Create/edit modal (Zod + react-hook-form), with a `datalist` and quick-pick chips sourced from `PREDEFINED_ACTIVITIES` |
| `src/features/activities/components/ActivityListItem.tsx` | Single activity row — order badge, name, status badge, edit/delete actions on hover |
| `src/features/activities/components/ActivitiesTab.tsx` | Activity list container within `CampDetailPage` — loading/empty/error states, create/edit/delete wiring |
| `src/features/activities/index.ts` | Barrel export (`ActivitiesTab`, `ActivityForm`, `ActivityListItem`) |

## Files Modified

| File | Change |
|---|---|
| `src/features/camps/components/CampDetailPage.tsx` | Replaced the "Activities — coming in Phase 5" placeholder with `<ActivitiesTab campId={camp.id} />`; removed the `phase: 'Phase 5'` tag from the Activities tab definition |
| `docs/PROJECT_CONTEXT.md` / `docs/MVP_ROADMAP.md` | To be marked Phase 5 complete (see Next Steps) |

## Features Completed

1. **Activity Service Layer** — `activityService.ts` follows the exact pattern established by `peopleService.ts` / `campService.ts`: plain `supabase.from('activities')` calls, RLS-aware, errors thrown as `Error(error.message)`.
2. **Activity List** — `ActivitiesTab` renders all activities for a camp in `activity_order` order, with an order-position badge, name, and status badge per row.
3. **Create Activity** — `ActivityForm` modal, reusing the exact modal chrome/markup pattern from `PersonForm`. Faculty can type a custom name or pick from `PREDEFINED_ACTIVITIES` (already defined in `constants/index.ts`) via a native `<datalist>` and quick-pick chips.
4. **Edit Activity** — Same `ActivityForm` modal in edit mode; only `activity_name` is editable in this milestone (order and status are not exposed to the UI — see Deferred Features).
5. **Delete Activity** — `window.confirm` guard (matching `CampPeopleTab`'s remove pattern), calls `deleteActivity`, reloads the list. The `activities` table has `ON DELETE CASCADE` from `camps`, and `photos.activity_id` cascades from `activities`, so no client-side cascade logic was needed.
6. **CampDetailPage Integration** — The Activities tab is now a live tab (no longer a "coming in Phase N" stub), wired the same way `people` is wired to `CampPeopleTab`.
7. **Sequential ordering without drag-and-drop** — New activities are appended to the end of the list. `getNextActivityOrder(campId)` reads the current max `activity_order` for the camp and returns `max + 1`; this keeps `activity_order` populated and stable without implementing reordering UI.

## Architectural Decisions

- **Mirrored the Phase 3/4 pattern exactly**: `service → hook → component`, feature-scoped folders (`services/`, `hooks/`, `components/`), barrel export via `index.ts`. No new patterns were introduced.
- **No new dependencies.** `@dnd-kit` remains unused, as drag-and-drop reordering is explicitly out of scope for this milestone (see Deferred Features). A native HTML `<datalist>` was used for predefined-activity suggestions instead of a custom combobox, keeping the form consistent with the codebase's existing "plain HTML form control + Tailwind" style (as seen in `PersonForm`'s `<select>`).
- **Status is set but not editable from the UI.** The `activities.status` column defaults to `'planned'` at the database level; `ActivityForm` does not expose a status control, and `ActivityListItem` only displays the status via the existing `ActivityStatusBadge` component. Status transitions (`planned → active → completed`) are deferred.
- **`activity_order` is assigned server-adjacent, not user-controlled.** Rather than let the DB's `DEFAULT 0` collide across multiple activities in the same camp, `createActivity` always receives an explicit `activity_order` computed by `getNextActivityOrder`, so the list has a stable append order even without drag-and-drop.
- **Prototype repository review.** `https://github.com/Rijog0105/Legal_Aid` was briefly inspected per the Phase 5 brief. It is an unconfigured Vite + React starter template (no TypeScript, no Supabase, no dedicated Activity Form component, and an unresolved merge-conflict marker in its own README). It contained no reusable activity UX. Per instructions, no further time was spent there; this repository's own `PersonForm` / `CampForm` / `CampPeopleTab` / `peopleService` / `usePeople` were used as the source of truth for structure and UX instead.

## Features Deferred to Milestone B

| Feature | Reason |
|---|---|
| **Drag-and-drop reordering** | Explicitly out of scope for this milestone. `activity_order` is currently append-only (new activities go to the end). `@dnd-kit/core` is already a project dependency and unused — ready for Milestone B. |
| **Activity status transitions** (`planned → active → completed`) | Explicitly out of scope. The column exists and defaults to `planned`; a `STATUS_FLOW`-style transition UI (matching the pattern already used for `CampStatus` in `CampDetailPage`) can be added in Milestone B. |
| Photo capture, survey forms, documentation review, report generation | Belong to later phases (6–8) per the MVP roadmap and were not touched. |

## Schema

No schema changes were made or required. Phase 5 uses the existing `activities` table exactly as defined in `supabase/migrations/001_complete_schema.sql` and typed in `src/types/database.types.ts`. No migrations, RLS policies, or types were modified.

## Verification

| Check | Result |
|---|---|
| Existing `Activity` type / constants reused as-is (`ActivityStatus`, `PREDEFINED_ACTIVITIES`, `ACTIVITY_STATUS`) | ✅ Confirmed, no changes needed |
| `activities` table usage matches existing schema/migration | ✅ Confirmed |
| Service/hook/component structure matches `PersonForm` / `CampForm` / `CampPeopleTab` / `peopleService` / `usePeople` | ✅ Mirrored |
| `npx tsc --noEmit` | Recommended before merge (not run in this environment) |
| `npm run build` | Recommended before merge (not run in this environment) |

## Next Phase — Phase 6 (Photo Documentation)

- `PhotoService` — upload to Supabase Storage (`camp-photos` bucket), CRUD on `photos` table, signed URL generation
- Volunteer mobile photo capture, tagged to the current activity (this phase's `Activity` records are the dependency Phase 6 needs)
- Faculty photo review gallery grouped by activity
- `activityStore` (Zustand) for active-activity context during volunteer capture — not built in this milestone, listed as a Phase 5 deliverable in the roadmap but not required for Milestone A CRUD scope; recommend adding it either at the start of Phase 6 or as a small Milestone B addition to Phase 5, since nothing in Milestone A needs it yet.
