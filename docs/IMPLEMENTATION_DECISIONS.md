# Implementation Decisions Log

> This document is the authoritative log of architectural/product decisions made **after** `docs/PROJECT_BLUEPRINT.md` was finalized. It does not replace the Blueprint — it records decisions that refine or extend it during implementation. Entries here describe *decisions*, not necessarily *shipped code*; each entry's **Status** field states plainly whether the decision has been implemented yet.

Format: one ADR (Architectural/Application Decision Record) per decision, in chronological order.

---

## ADR-001 — People Registry is Permanent

**Date:** 2026-07-18
**Status:** Approved – Pending Implementation

**Motivation**
People records are referenced by historical camp assignments and, eventually, by generated reports. Allowing hard deletion risks silently breaking historical camp/report data and re-creates a bug class already observed in this project (deletion appearing to succeed while leaving orphaned or dangling references). A permanent registry removes an entire category of data-integrity risk.

**Decision**
- Remove the ability to delete a person from the People Registry (UI action and service call).
- Camp *assignments* (`camp_people` rows) may still be removed — a person can be un-assigned from a specific camp without deleting their underlying registry record.
- Historical person records are retained indefinitely.

**Expected Implementation Phase**
Not yet scheduled — deferred until after Phase 5 merge, ahead of Phase 6.

**Impact**
- `PeoplePage.tsx` — the delete button/confirm-dialog action must be removed.
- `peopleService.ts` — `deletePerson()` should be removed or explicitly disabled at the call site.
- `supabase/migrations/002_persons_delete_policy.sql` currently **adds** a `persons_delete` RLS policy (admin/faculty), which is the opposite of this decision. A follow-up migration will be needed to revoke or replace that policy once this ADR is implemented — see "Future Considerations."

**Future Considerations**
Migration `002_persons_delete_policy.sql` is currently live and *contradicts* this ADR (it grants delete rather than removing it). This must be reconciled — either via a new migration that drops the `persons_delete` policy, or by intentionally leaving the DB-level policy in place as a defense-in-depth admin-only escape hatch while removing the delete affordance from the UI entirely. This choice should be made explicitly when this ADR is implemented, not left ambiguous.

---

## ADR-002 — Add `roll_number` to `persons` for Student Identification

**Date:** 2026-07-18
**Status:** Approved – Pending Implementation

**Motivation**
Student names are not reliably unique across cohorts and years, which causes ambiguity when assigning students to camps or attributing report content. A permanent, student-specific identifier solves this without affecting faculty or guest records, which have no equivalent identifier.

**Decision**
- Add a `roll_number` column to `public.persons`.
- Add a partial unique index on `roll_number` covering non-`NULL` values only (so faculty/guest rows, which leave it `NULL`, are unaffected by uniqueness constraints).
- Faculty and Guests leave `roll_number` `NULL`.

**Expected Implementation Phase**
Not yet scheduled — deferred until after Phase 5 merge.

**Impact**
- Requires a new Supabase migration (e.g. `003_persons_roll_number.sql`) — **no such migration currently exists in this repository.**
- `src/types/database.types.ts` — `Person` interface needs a `roll_number: string | null` field.
- `src/features/people/services/peopleService.ts` — `PersonPayload` needs a `roll_number` field.
- `src/features/people/components/PersonForm.tsx` — needs a conditional `roll_number` input, shown only when `category === 'student'`.

**Future Considerations**
None at this time.

---

## ADR-003 — Group People Assignment by Students, Faculty, and Guests

**Date:** 2026-07-18
**Status:** Approved – Pending Implementation

**Motivation**
As camps grow to include dozens of assigned people, a flat unsorted list becomes hard to scan. Grouping by category mirrors how faculty naturally think about a camp roster and makes the assignment UI easier to audit at a glance.

**Decision**
People assignment (in `AssignPersonModal` and/or `CampPeopleTab`) should eventually present candidates/assignees grouped into three sections: Students, Faculty, Guests.

**Expected Implementation Phase**
Not yet scheduled — likely bundled with ADR-004/ADR-005/ADR-006 since they touch the same components.

**Impact**
- `src/features/camps/components/AssignPersonModal.tsx` — currently a flat filtered list; needs grouping logic.
- `src/features/camps/components/CampPeopleTab.tsx` — currently a flat table ordered by `assigned_at`; needs grouping logic (see also ADR-006, which specifies the *assigned* list's group order, which differs from this ADR's candidate-list grouping).

**Future Considerations**
Clarify whether "Students/Faculty/Guests" grouping (this ADR, for the *picker*) and "Guests → Faculty → Team Leads → Volunteers" ordering (ADR-006, for the *assigned list*) are meant to use `Person.category` and `CampPerson.camp_role` respectively, or whether one should drive the other.

---

## ADR-004 — Students Default to Volunteer; Faculty May Promote to Team Lead

**Date:** 2026-07-18
**Status:** Approved – Pending Implementation

**Motivation**
Most students assigned to a camp serve as volunteers; requiring faculty to manually pick a role for every student assignment is unnecessary friction. Faculty should still retain the ability to designate specific students as Team Leads when needed.

**Decision**
- When assigning a person with `category = 'student'`, the camp role defaults to `volunteer` automatically.
- Faculty can manually change a selected student's assignment to `team_lead`.

**Expected Implementation Phase**
Not yet scheduled — bundled with ADR-003/ADR-005/ADR-006.

**Impact**
- `AssignPersonModal.tsx` — currently defaults every assignment to `CAMP_ROLE.VOLUNTEER` regardless of category (an incidental default, not category-driven logic). This needs to become an explicit category-conditioned default, with a role override control retained specifically for students.

**Future Considerations**
None at this time.

---

## ADR-005 — Faculty and Guest Camp Roles Should Be Inferred Automatically

**Date:** 2026-07-18
**Status:** Approved – Pending Implementation

**Motivation**
Faculty and Guests only ever occupy one meaningful camp role each (`faculty_coordinator` and `guest` respectively). Presenting a manual role picker for these categories adds a redundant decision step with only one sensible answer.

**Decision**
When assigning a person with `category = 'faculty'` or `category = 'external'` (guest), the camp role is inferred automatically from the category — no manual role picker is shown for these categories.

**Expected Implementation Phase**
Not yet scheduled — bundled with ADR-003/ADR-004/ADR-006.

**Impact**
- `AssignPersonModal.tsx` — currently shows a manual `camp_role` `<select>` for every person regardless of category. Needs conditional logic: show the picker only for students (per ADR-004), infer and hide it otherwise.

**Future Considerations**
Confirm the exact category → role mapping (`faculty` → `faculty_coordinator`, `external` → `guest`) matches how `PERSON_CATEGORY` and `CAMP_ROLE` are intended to align long-term.

---

## ADR-006 — Assigned People Display Order

**Date:** 2026-07-18
**Status:** Approved – Pending Implementation

**Motivation**
A consistent, role-significant ordering (rather than assignment-timestamp ordering) makes the camp roster easier to read at a glance — guests and faculty (fewer in number, often named in reports first) surfaced above the larger volunteer/team-lead pool.

**Decision**
Assigned people should display in this fixed group order: **Guests → Faculty → Team Leads → Volunteers.**

**Expected Implementation Phase**
Not yet scheduled — bundled with ADR-003/ADR-004/ADR-005.

**Impact**
- `CampPeopleTab.tsx` — currently ordered by `assigned_at` only (inherited from `fetchCampPeople`'s `.order('assigned_at')`). Needs either a client-side sort by `camp_role` in this fixed order, or a query-level `ORDER BY` using a `CASE` expression on `camp_role`.

**Future Considerations**
None at this time.

---

## ADR-007 — Use `designation` and `organization` for Richer Report Generation

**Date:** 2026-07-18
**Status:** Approved – Already Satisfied (no implementation needed)

**Motivation**
Report generation (Phase 8) needs to attribute people with more than just a name — their designation and organization/institution matter for institutional reports.

**Decision**
`designation` and `organization` columns on `persons`, and the corresponding fields already present in `PersonForm`/`peopleService`, will be used as inputs to the Phase 8 report generator.

**Expected Implementation Phase**
Phase 8 (Report Generation) — consumption only; no new work needed now.

**Impact**
None right now. Unlike ADR-001 through ADR-006, this decision requires **no code changes** — `designation` and `organization` already exist on `Person` (`src/types/database.types.ts`), in `PersonPayload` (`peopleService.ts`), and as form fields in `PersonForm.tsx`, all shipped in Phase 3. This ADR simply records the *intended future use* of already-existing fields; it is not a pending implementation task.

**Future Considerations**
None at this time.

---

## Summary Table

| ADR | Title | Status |
|---|---|---|
| ADR-001 | People Registry is permanent | Approved – Pending Implementation |
| ADR-002 | Add `roll_number` to persons | Approved – Pending Implementation |
| ADR-003 | Group assignment by Students/Faculty/Guests | Approved – Pending Implementation |
| ADR-004 | Students default to Volunteer, promotable to Team Lead | Approved – Pending Implementation |
| ADR-005 | Faculty/Guest camp role inferred automatically | Approved – Pending Implementation |
| ADR-006 | Assigned people display order (Guests → Faculty → Team Leads → Volunteers) | Approved – Pending Implementation |
| ADR-007 | Use designation/organization in report generation | Approved – Already Satisfied |

**None of ADR-001 through ADR-006 are represented as implemented anywhere else in this repository's documentation.** `docs/PROJECT_CONTEXT.md`'s "Known Bugs" and "Current Feature Status" sections still describe the People Registry as it exists today (delete present but broken, no grouping, no `roll_number`) and have not been altered to imply otherwise.
