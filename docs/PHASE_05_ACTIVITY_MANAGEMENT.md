# Phase 5 — Activity Management

## Status: ✅ Complete (Milestone A + Milestone B)

## Files Created (Milestone A)

| File | Purpose |
|---|---|
| `src/features/activities/services/activityService.ts` | Supabase CRUD for `activities` |
| `src/features/activities/hooks/useActivities.ts` | List hook for a camp's activities |
| `src/features/activities/components/ActivityForm.tsx` | Create/edit modal |
| `src/features/activities/components/ActivityListItem.tsx` | Single activity row |
| `src/features/activities/components/ActivitiesTab.tsx` | Activity list container within `CampDetailPage` |
| `src/features/activities/index.ts` | Barrel export |

## Files Modified (Milestone B)

| File | Change |
|---|---|
| `src/features/activities/services/activityService.ts` | Added `updateActivityStatus(id, status)` and `reorderActivities(campId, orderedIds)` |
| `src/features/activities/hooks/useActivities.ts` | Now exposes `setActivities` (matching `useCamp`'s `setCamp`) so the tab can apply optimistic updates for status changes and drag reorder without a full refetch |
| `src/features/activities/components/ActivityListItem.tsx` | Now a `@dnd-kit/sortable` sortable row (drag handle via `useSortable`); added a "Mark {next status}" button driven by a local `STATUS_FLOW`/`STATUS_LABELS` pair (mirrors `CampDetailPage`'s camp-status pattern) |
| `src/features/activities/components/ActivitiesTab.tsx` | Wrapped the list in `DndContext` + `SortableContext` (`@dnd-kit/core`, `@dnd-kit/sortable`), added `handleDragEnd` (optimistic reorder + persist, rollback via `reload()` on failure) and `handleStatusChange` (optimistic status update) |
| `src/features/activities/components/ActivityForm.tsx` | Replaced the `datalist` with a `<select>` of `PREDEFINED_ACTIVITIES` plus an "Other / Custom Activity" option; a custom-name `Input` now appears conditionally via `watch()` when "Other" is selected |
| `src/features/camps/components/CampDetailPage.tsx` | Unchanged since Milestone A — `<ActivitiesTab campId={camp.id} />` already wired |

No files were added in Milestone B; all work extended the existing Milestone A files.

## Features Completed

### Milestone A
1. **Activity Service Layer**, **Activity List**, **Create/Edit/Delete Activity**, **CampDetailPage Integration**, **append-only ordering** — see prior revision of this doc; unchanged in substance.

### Milestone B
2. **Drag-and-drop reordering** — Activities can be reordered by dragging the grip handle on each row. `ActivitiesTab` uses `DndContext`/`SortableContext` with a `PointerSensor` (5px activation distance to avoid interfering with clicks). On drop, the new order is applied optimistically to local state via `setActivities`, then persisted with `reorderActivities`, which writes a fresh 0-indexed `activity_order` to every activity in the camp. If the persist call fails, the list falls back to `reload()` to resync with the server.
3. **Activity status workflow** — `planned → active → completed`, implemented the same way camp status transitions work in `CampDetailPage`: a local `STATUS_FLOW: Record<ActivityStatus, ActivityStatus[]>` map defines the single valid next status, and each row shows one "Mark {label}" button when a next status exists (none once `completed`). Clicking it calls `updateActivityStatus`, which updates Supabase immediately, and the returned row replaces the local one via `setActivities`.
4. **Improved Activity Form UX** — The predefined-activity `datalist` was replaced with a `<select>` listing all `PREDEFINED_ACTIVITIES` plus a final "Other / Custom Activity" option. Selecting "Other" reveals a `Custom Activity Name` text input (via `react-hook-form`'s `watch`), validated with a Zod `.refine()` requiring at least 2 characters when "Other" is chosen. On submit, the two fields are always collapsed into a single `activity_name` string — the stored value has no notion of "template vs custom" at the data layer. Editing an existing custom-named activity correctly pre-selects "Other" and pre-fills the custom name; editing a predefined one pre-selects that option in the dropdown.
5. **Volunteer activity selection groundwork** — Reviewed and confirmed, no code changes needed: `Activity.id` and `Activity.camp_id` are already on the base type (`src/types/database.types.ts`), and `fetchActivities(campId)` already scopes strictly to one camp and returns rows ordered by `activity_order`. A future Phase 6 volunteer activity-selector can call this same function directly (or a thin camp-scoped `WHERE camp_id = current_camp` variant) with no schema or service changes required.

## Architectural Decisions

- **Milestone A decisions stand** (feature-module structure, service/hook/component layering, no premature abstractions) — see below for what Milestone B added on top.
- **Reused `@dnd-kit/core` + `@dnd-kit/sortable` + `@dnd-kit/utilities`**, all already project dependencies from Phase 1, previously unused. No new packages were installed.
- **Reordering persistence is a full rewrite of `activity_order` for the camp**, not a single-row move. This was chosen over a fractional/gap-based ordering scheme to keep the implementation simple and consistent with the project's "avoid unnecessary abstractions" directive — the list sizes involved (a camp's activities) are small enough that rewriting all rows on drop is cheap and avoids ordering-collision edge cases entirely.
- **Status transitions reuse the exact `STATUS_FLOW`/`STATUS_LABELS` shape already used for camps in `CampDetailPage`**, kept local to `ActivityListItem.tsx` rather than extracted into a shared utility, since the two status enums (`CampStatus` vs `ActivityStatus`) are unrelated domains and forcing a shared abstraction would reduce clarity for no real gain.
- **The Activity Form's "template vs custom" distinction is UI-only.** `ActivityPayload.activity_name` and the `activities.activity_name` column are unchanged — a plain string. The Zod schema's `template`/`custom_name` split exists solely inside `ActivityForm.tsx` and is collapsed before any service call, so no other part of the codebase (list rendering, service layer, database) needed to change.
- **No new Zustand store.** `activityStore` (mentioned in the original Phase 5 roadmap entry) is still not needed — nothing in Milestone A or B requires shared "current activity" state; that remains a Phase 6 (volunteer capture) concern, to be added when that work begins.

## Features Deferred (still out of Phase 5 scope)

| Feature | Reason |
|---|---|
| Photo capture, survey forms, documentation review, report generation | Belong to later phases (6–8) per the MVP roadmap and were not touched. |
| Volunteer Dashboard / volunteer activity-selector UI | Explicitly excluded from this milestone; only the groundwork (camp-scoped `fetchActivities`, exposed `id`/`camp_id`) was verified. |
| `activityStore` (Zustand) | Not required until Phase 6's volunteer photo capture needs "current activity" context. |

Nothing else from the original Phase 5 scope remains deferred — reordering and status transitions, the two Milestone A deferrals, are both complete.

## Schema

No schema changes were made or required in either milestone. Phase 5 uses the existing `activities` table exactly as defined in `supabase/migrations/001_complete_schema.sql` and typed in `src/types/database.types.ts`. `status` continues to use the existing `planned | active | completed` check constraint; no new statuses were introduced.

## Verification

| Check | Result |
|---|---|
| Existing `Activity` type / constants reused as-is (`ActivityStatus`, `PREDEFINED_ACTIVITIES`, `ACTIVITY_STATUS`) | ✅ Confirmed, no changes needed |
| `activities` table usage matches existing schema/migration | ✅ Confirmed |
| Service/hook/component structure matches `PersonForm` / `CampForm` / `CampPeopleTab` / `peopleService` / `usePeople` | ✅ Mirrored |
| Reordering persists `activity_order` to Supabase | ✅ Implemented via `reorderActivities` |
| Status workflow updates Supabase immediately and reflects in UI | ✅ Implemented via `updateActivityStatus` + optimistic `setActivities` |
| Activity Form: predefined dropdown + "Other / Custom" text input | ✅ Implemented, validated with Zod `.refine()` |
| No schema/migration/RLS changes | ✅ Confirmed |
| No Phase 6 functionality (photo capture, volunteer dashboard, surveys, reports) introduced | ✅ Confirmed |
| `npx tsc --noEmit` | Recommended before merge (not run in this environment) |
| `npm run build` | Recommended before merge (not run in this environment) |

## Next Phase — Phase 6 (Photo Documentation)

- `PhotoService` — upload to Supabase Storage (`camp-photos` bucket), CRUD on `photos` table, signed URL generation
- Volunteer mobile photo capture, tagged to the current activity — `fetchActivities(campId)` is ready to back a camp-scoped activity selector with no changes
- Faculty photo review gallery grouped by activity
- `activityStore` (Zustand) for active-activity context during volunteer capture, to be introduced at the start of this phase
