# Implementation Milestones

> This document tracks **implementation milestones** — approved architectural improvements that are delivered *between* Blueprint phases, without altering the official phase sequence.
>
> It is separate from, and does not replace:
> - `docs/PROJECT_BLUEPRINT.md` — the master specification
> - `docs/PROJECT_CONTEXT.md` — current handover/status snapshot
> - `docs/MVP_ROADMAP.md` — the official Blueprint-phase roadmap
> - `docs/IMPLEMENTATION_DECISIONS.md` — the ADR log (the *why* behind each decision)
>
> A milestone groups one or more approved ADRs into a schedulable unit of work. Milestones do not renumber or insert into the Blueprint's phase sequence (no "Phase 5.5," no "Phase 6A") — they are tracked independently, positioned relative to the phases they fall between.

---

## Milestone 1 — People Registry & Camp Assignment Redesign

**Status:** Planned

**Scheduled Position:** Between Phase 5 and Phase 6

**Related ADRs:** ADR-001, ADR-002, ADR-003, ADR-004, ADR-005, ADR-006 (see `docs/IMPLEMENTATION_DECISIONS.md`)

**Scope**
- Permanent People Registry — remove the ability to delete a person record (ADR-001)
- Student `roll_number` support — schema migration, type, form field (ADR-002)
- Group assignment UI — Students / Faculty / Guests (ADR-003)
- Student assignments default to Volunteer, promotable to Team Lead by faculty (ADR-004)
- Automatic camp-role inference for Faculty and Guests (ADR-005)
- Assigned-people display ordering: Guests → Faculty → Team Leads → Volunteers (ADR-006)

**Acceptance Criteria**
- [ ] Delete action removed from `PeoplePage.tsx`; `peopleService.deletePerson()` removed or disabled at the call site
- [ ] `persons_delete` RLS policy (`002_persons_delete_policy.sql`) reconciled — either dropped via a new migration, or explicitly retained as an admin-only DB-level fallback, with the choice documented
- [ ] New migration adds `roll_number` column to `public.persons` with a partial unique index on non-`NULL` values
- [ ] `Person` type, `PersonPayload`, and `PersonForm.tsx` updated to support `roll_number`, shown only for `category = 'student'`
- [ ] `AssignPersonModal.tsx` groups candidates by Students / Faculty / Guests
- [ ] `AssignPersonModal.tsx` defaults student assignments to `volunteer`, with a role override retained for promoting a student to `team_lead`
- [ ] `AssignPersonModal.tsx` no longer shows a manual role picker for `faculty` or `external` (guest) categories — role is inferred
- [ ] `CampPeopleTab.tsx` displays assigned people ordered Guests → Faculty → Team Leads → Volunteers
- [ ] `npx tsc --noEmit` and `npm run build` both pass after implementation
- [ ] `docs/PROJECT_CONTEXT.md`, `docs/MVP_ROADMAP.md`, and `docs/IMPLEMENTATION_DECISIONS.md` updated to reflect completion once this milestone ships

**Notes**
- This milestone touches the same files Phase 4 introduced (`AssignPersonModal.tsx`, `CampPeopleTab.tsx`, `PeoplePage.tsx`, `peopleService.ts`) plus `database.types.ts` and a new Supabase migration — no Blueprint phase's scope is being altered, only the People/Camp-assignment surface delivered in Phase 4.
- Recommended sequencing: resolve ADR-001's RLS-policy question first (it determines whether a new migration is needed alongside ADR-002's), then implement ADR-002, then ADR-003/004/005/006 together since they share the same two component files.
- As of this writing, none of ADR-001 through ADR-006 have been implemented. This milestone remains **Planned**, not **In Progress**.

---

## Milestone Log

| # | Title | Status | Position | Related ADRs |
|---|---|---|---|---|
| 1 | People Registry & Camp Assignment Redesign | Planned | Between Phase 5 and Phase 6 | ADR-001–006 |
