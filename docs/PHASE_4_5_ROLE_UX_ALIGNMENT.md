# Phase 4.5 — Role & UX Alignment

## Status: Accepted with Deferred Issues

> This document records verified test findings from Phase 4 acceptance testing and defines
> the scope of Phase 4.5 corrective work before Phase 5 (Activity Management) begins.

---

## Phase 4 Test Results

### Authentication

| Test | Result |
|---|---|
| Login | ✅ Verified |
| Logout | ✅ Verified |
| Session persistence | ✅ Verified |
| Route protection | ✅ Verified |

### Authorization

| Test | Role | Result |
|---|---|---|
| Create camp | Faculty | ✅ Verified — camp created successfully |
| Create camp | Volunteer | ⚠️ UI permits access — operation fails |
| Create camp | Team Lead | 🔲 Pending |

---

## Identified Issues

### Issue 1 — Volunteer UI does not match MVP requirements

**Severity:** High — volunteers see administrative UI they should never access.

**Expected volunteer experience:**
- Mobile-first interface
- Fill form (activity participation, survey responses)
- Capture and upload photos

**Volunteers must not see:**
- Camp Management
- Camp Creation
- Budget
- Reports
- Any administrative function

**Current state:** Volunteers are reaching camp creation UI and attempting (and failing) to
create camps. The UI does not enforce role-appropriate navigation.

---

### Issue 2 — Display name shows 'User' for Team Lead and Volunteer roles

**Severity:** Medium — affects all non-faculty roles.

**Expected:** User's full name sourced from the linked `persons` record.

**Actual:** The string `'User'` is displayed instead of the person's name.

**Affected roles:** Team Lead, Volunteer (Faculty unaffected — to be confirmed).

---

### Issue 3 — Role-based layout separation not fully implemented

**Severity:** High — root cause of Issues 1 and 2.

**Current state:** A single layout is shared across roles without enforcing
role-appropriate navigation, visibility, or display logic.

**Expected state:** Each role has a dedicated layout that controls navigation,
visible features, and user identity display.

---

## Phase 4.5 Scope

Phase 4.5 is a corrective phase inserted between Phase 4 (Camp Management) and
Phase 5 (Activity Management). No new features are added. The goal is to align
role-based UX with finalized MVP requirements before building further.

### Deliverables

| Deliverable | Description |
|---|---|
| `FacultyLayout` | Sidebar layout for faculty and admin roles. Camp management, people registry, reports, budget all accessible. Current `AppShell` behaviour. |
| `TeamLeadLayout` | Constrained sidebar layout for team leads. Camp detail view, activity status updates, photo review. No camp creation, no budget, no reports. |
| `VolunteerLayout` | Mobile-first layout for volunteers. Photo capture, form fill, activity view only. No camp management, no budget, no reports, no creation UI. |
| Display name fix | Resolve `'User'` fallback for Team Lead and Volunteer — source full name from `persons` join on `users` profile. |
| Route guard alignment | Ensure each role can only reach routes appropriate to that role. Unauthorised navigation redirects cleanly. |

### Out of Scope for Phase 4.5

- No new data entry features
- No changes to database schema
- No changes to Supabase RLS policies
- No activity management (Phase 5)
- No photo capture (Phase 6)

### Success Criteria

- [x] Faculty login shows full sidebar with all administrative navigation
- [ ] ~~Team Lead login shows constrained navigation — no camp creation, no budget, no reports~~ — **Deferred**
- [ ] ~~Volunteer login shows mobile-first interface — photo capture and form fill only~~ — **Deferred**
- [ ] ~~No role can navigate to a route outside their permitted set~~ — **Deferred**
- [ ] ~~Display name shows person's full name for all roles~~ — **Deferred**
- [x] All existing Phase 4 auth tests continue to pass

> These items have been deferred and are not required for commencement of Phase 5.

---

## Dependencies

- Phase 4 complete ✅
- Auth and session management verified ✅
- Role data available in store (`roleName`) ✅

---

## Deferred Issues

The following issues were investigated during Phase 4.5 review but were determined not to
block MVP progress and are deferred to a later hardening/refinement phase.

### Deferred Issue 1 — Display Name Resolution

**Observed:**
- Faculty display name resolves correctly.
- Team Lead and Volunteer users display "User".

**Investigation Summary:**
- `users` records exist.
- `persons` records exist.
- `role` records exist.
- `auth_user_id` mappings verified.
- No conclusive root cause identified during Phase 4.5 review.

**Impact:** Cosmetic/UI issue only. Does not block camp management or future MVP phases.

**Priority:** Low

---

### Deferred Issue 2 — Role-Based Navigation Separation

**Observed:** Volunteers currently see navigation items intended for administrative roles.

**Current Behaviour:**
- Restricted actions are not successfully executed.
- Backend protections remain in place.

**Impact:** UX issue. Does not block Activity Management development.

**Priority:** Medium

---

### Deferred Issue 3 — Authorization Guard Hardening

**Observed:** Route protection behaviour requires additional review and testing.

**Impact:** Requires future audit before production deployment.

**Priority:** Medium

---

## Phase 4.5 Outcome

Phase 4.5 review determined that no critical blocker exists for continuation into Phase 5.
Authentication, session management, database structure, role records, person records, and
camp creation functionality have been validated.

Remaining issues are classified as deferred refinement items and will be addressed during
a future hardening pass prior to production deployment.

---

## Next Phase

Phase 5 — Activity Management

Phase 5 may begin immediately. Phase 4.5 is accepted with deferred issues recorded above.
