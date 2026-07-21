# Legacy Survey Subsystem — Architectural Analysis & Reverse Engineering Report

**Source repository:** `github.com/Rijog0105/Legal_Aid`
**Purpose of this document:** Extract every reusable idea from the legacy survey app so it can inform the design of the survey engine for the new Legal Aid Camp Management Platform. No code from the legacy repo is to be migrated — this is a knowledge-extraction exercise only.

---

## 1. Executive Summary

The legacy repository is a **single-purpose, single-survey-type Progressive Web App**. It was built to let a volunteer fill out one fixed household legal-awareness questionnaire (~20 hardcoded questions plus a family-members table) in the field, save it locally if there's no signal, and push it to Supabase once a connection is available. It also ships a Dashboard, Analytics, and Reports (PDF/XLSX/CSV) module built on top of the same flat data shape.

The most important finding, and the one that should most influence the new engine's design, is this: **the legacy app is not a survey engine — it is one survey, hardcoded into a 1,663-line React component.** There is no concept of a survey *template*, no question-type abstraction, no multi-survey support, and no data model for camps, beneficiaries, or activities as first-class entities (all of which your new platform already has). Everything the legacy app does well, it does at the level of *implementation craft* — image compression, offline persistence, auto-sync, PWA installability — not at the level of *product architecture*. That craft is highly reusable as a set of patterns; the architecture around it is not.

The rest of this document walks through the system in detail, then proposes a survey engine architecture for your new platform that keeps every proven implementation pattern (compression thresholds, Dexie schema versioning, background-online-event sync) while replacing the rigid, single-form architecture with a dynamic, template-driven, entity-linked engine.

---

## 2. Repository Architecture

**Stack:** React 19 + Vite 8, Tailwind CSS, Supabase (Postgres + Storage), Dexie.js (IndexedDB wrapper), Recharts, jsPDF, SheetJS (xlsx). No TypeScript, no Zustand, no router, no test suite, no CI config.

**Folder structure** is flat and shallow — a strong signal this was built as a single-screen tool rather than a scalable app:

```
src/
  App.jsx                 → top-level shell: tabs, PWA install, online/offline events, auto-sync
  components/
    WelcomeScreen.jsx      → one-time daily splash screen
    Header.jsx             → connectivity + pending-count indicator
    SurveyForm.jsx          → THE survey (1,663 lines, one hardcoded form)
    OfflineForms.jsx         → manual "pending surveys" queue + Sync All button
    Dashboard.jsx            → aggregate stats (lazy-loaded)
    Analytics.jsx            → charts over survey_answers (lazy-loaded)
    Reports.jsx (995 lines)   → PDF/XLSX/CSV export (lazy-loaded)
  db/indexedDB.js           → Dexie schema + CRUD helpers for one table: pending_surveys
  utils/imageOptimization.js → canvas-based JPEG compression pipeline
  utils/surveyAnalytics.js   → pure functions that tabulate survey_answers for charts
  supabaseClient.js          → Supabase client + payload↔row mapping + Storage upload
public/
  sw.js                     → hand-written service worker (stale-while-revalidate + app-shell fallback)
  manifest.json             → PWA manifest
```

**Global architecture in one sentence:** a single React component tree, no routing, tab state held in `useState` in `App.jsx`, one Dexie table as the offline buffer, and a Supabase table (`responses`) as the system of record, with a `localStorage`-based mock database used automatically whenever Supabase env vars aren't configured (useful for demos, but a silent trap in production if `.env` is ever missing).

There is **no state management library** — no Redux, no Zustand, no Context API even. Every screen manages its own local `useState`, and cross-screen communication is done through **global browser `CustomEvent`s** (`offline-surveys-updated`, `surveys-updated`) dispatched on `window` and listened to with `addEventListener`. This is a deliberate (if unusual) way to avoid prop drilling without adopting a store, and it works for a 5-screen app, but it does not scale to a multi-role, multi-survey platform.

---

## 3. Survey System

**Survey creation:** There is no survey *creation* — the survey is compiled into the app. `SurveyForm.jsx` declares fixed `useState` objects for five sections: `surveyInfo` (group/form number, village, date), `respondentDetails` (name, address, phone, gender, age, occupation, district, education), `familyMembers` (a repeatable array of dependents with ID-document fields), `questions` (literally `q8` through `q21`, some with conditional "Details" sub-fields and one nested object `q17` for a checklist of legal-awareness topics), and `villageInfo` (infrastructure questions: water, transport, electricity, drainage, roads, healthcare).

**Question definition:** Questions are not data — they are JSX. Each question's label, input type (radio/select/text), and conditional-reveal logic (e.g., "if q10 = No, clear q10Details") is written directly into the render function and the `handleQuestionsChange` handler. There is exactly one question set, one survey "shape," for the entire app.

**Answer storage:** All state collapses into one nested JS object at submit time — `personal_details`, `family_members`, `survey_answers`, `village_info` — and that object is what actually gets persisted (see `db/indexedDB.js`, `getSurveyPayloadFromOfflineRecord`).

**Photo/document attachment:** Only one attachment type exists: a single "verification document" (Aadhaar/other ID) per survey, captured via camera or gallery, compressed client-side, and stored as a base64 data URL inside the same payload object.

**Beneficiaries / camps / activities:** None of these exist as entities. A survey is identified only by respondent name + village name; there is no `beneficiary_id`, `camp_id`, or `activity_id` anywhere in the schema. This is the single biggest structural gap relative to your new platform.

**Validation:** Four fields only — village name, resident name, gender, and a numeric age check (`validateForm()` in `SurveyForm.jsx`). Everything else, including all ~20 legal-awareness questions, is optional with no schema-level enforcement.

**Draft saving / navigation:** There is no explicit "Save Draft" affordance and no multi-step wizard. The entire form renders as one long scrollable page; "saving" only happens implicitly when the volunteer hits Submit while offline (it's routed into the offline queue instead of Supabase) — there's no way to save a partially-filled survey and come back later except by using the browser without closing it. `editId` lets a volunteer reopen and edit an already-queued offline survey, which is the closest thing to a draft mechanism.

**Submission:** On submit, the app checks `navigator.onLine`. If online, it inserts directly into Supabase; if that call throws for any reason, it falls back to saving into IndexedDB rather than losing the data. If offline, it goes straight to IndexedDB. Either path ends by resetting the form to blank state.

---

## 4. Offline Architecture

- **IndexedDB via Dexie**, one table: `pending_surveys`. Schema evolves through three versions (`db.version(1|2|3).stores(...)`), adding `sync_status` and `verification_status` indexes over time — a real, if minimal, example of forward-compatible local schema migration.
- **No LocalStorage** for survey data itself (only used for small flags: `lastWelcomeShowDate`, `pwaInstalled`, `lastSuccessfulSyncTime`, and the Supabase-mock fallback table).
- **No SQLite / WASM database.**
- **Service Worker** (`public/sw.js`, hand-written, no Workbox): caches the app shell (`/`, `/index.html`, `/logo.svg`, `/manifest.json`) plus same-origin and Google Fonts assets, using a stale-while-revalidate strategy, with a navigation fallback to `index.html` when offline. It explicitly bypasses caching for Supabase requests. This caches the **app**, not the **data** — data offline-availability is entirely Dexie's job.
- **No Background Sync API** (`navigator.serviceWorker.ready.sync.register`) — sync is done entirely from the foreground JS thread.
- **Sync queue / engine:** Two parallel, near-duplicate implementations of the same logic exist — one in `App.jsx` (`syncPendingSurveys`, auto-triggered on the `online` event and on mount) and one in `OfflineForms.jsx` (`handleSyncAll`, manually triggered by a button). Both iterate the pending list **sequentially**, calling `insertSurvey` one at a time, and **both stop entirely on the first error** rather than skipping the failed item and continuing with the rest. Neither has retry/backoff, batching, or partial-failure handling.
- **Conflict resolution:** None. Since each queued survey becomes a brand-new Supabase row, there's no update-conflict scenario to resolve — the model is append-only, which sidesteps the hard problem rather than solving it.

---

## 5. Photo System

- **Capture flow:** three separate hidden `<input type="file">` elements — one with `capture="environment"` (rear camera), one plain (gallery), one general file picker — all routed through a single `handleVerificationFile` handler.
- **Compression (`utils/imageOptimization.js`):** a genuinely well-built two-dimensional search. It tries a descending ladder of widths (`[800, 720, 640, 560, 480]`) and, at each width, a descending ladder of JPEG qualities (`[0.82 → 0.40]`), rendering to an off-screen `<canvas>` each time, and returns the **first** combination that lands at or under a **100 KB hard cap**. If nothing meets the cap, it falls back to the best (smallest) blob obtained and only throws if even that is over budget.
- **Preview:** the compressed result is stored as a `dataUrl` (base64) and shown as an `<img>` preview, with compressed-size and type shown to the user, and a note that it will upload to Supabase Storage once online.
- **Storage:** on submit, `supabaseClient.js` converts the stored `dataUrl` back into a `Blob`, builds a deterministic, sanitized storage path (`verification-documents/{date}/{timestamp}-{village}_{formNumber}_{name}_{docType}.{ext}`), and uploads to a Supabase Storage bucket, auto-creating the bucket on a "bucket not found" error rather than requiring pre-provisioning.
- **Upload retry:** none beyond the one auto-create-bucket retry; a failed upload throws and the whole survey submission is caught by the "save offline instead" fallback described above.
- **Offline queue:** because the compressed image is embedded as a data URL directly inside the same JSON payload as the rest of the survey, it rides along in IndexedDB for free — there is no separate photo-upload queue, which is simple but means large image data inflates every offline record and blocks Dexie's 5 MB should the survey ever support multiple photos.
- **Only one photo type exists** (a single ID/verification document) — there is no generic "attach N photos to this activity/beneficiary" capability.

---

## 6. Data Model (Reverse-Engineered)

The legacy system's actual persisted shape is flat and single-purpose. Below is the ER-style breakdown as it truly exists (not as it should exist):

```
┌──────────────────────────────┐
│ responses (Supabase table)    │
│  id (uuid, PK)                 │
│  group_number                  │
│  survey_form_number             │
│  village_name                    │
│  survey_date                       │
│  resident_name                      │
│  address / phone_number / gender     │
│  age / occupation / district / edu.   │
│  family_members    (JSON array) ──────┼──▶ [{ name, age, education,
│  survey_answers    (JSON blob)  ───────┤       birthCertificate, voterId,
│    ├─ q8..q21 (+ *Details fields)      │       panCard, aadhaarCard,
│    ├─ village_info (nested)            │       bankAccount, aadhaarLinked,
│    ├─ verification_document_url         │       seniorCitizenCard }]
│    ├─ verification_document_name          │
│    ├─ verification_document_type            │
│    └─ status                                   │
└──────────────────────────────────────────────────┘
        ▲
        │ mirrored 1:1 (pre-sync) as
┌──────────────────────────────┐
│ pending_surveys (Dexie/IDB)    │
│  id (autoincrement, PK, local)  │
│  name / village / created_at     │
│  sync_status / verification_status │
│  payload (the full nested object)   │
│  personal_details / family_members / │
│  survey_answers / village_info (denormalized copies for list-view queries)
└──────────────────────────────┘
```

**There is no `camps`, `activities`, `beneficiaries`, `volunteers`, or `templates` table.** "Village" is a free-text string, not a foreign key. A "beneficiary" only exists implicitly as the respondent named inside one survey row — there is no way to attach two surveys, or a survey and a photo, to the same real-world person or event over time. This is the central data-model limitation to solve in the new engine.

---

## 7. State Management

- **Global app state:** plain `useState` in `App.jsx` — active tab, online status, pending count, edit target, sync/install banners. No Context, no external store.
- **Form state:** five independent `useState` objects inside `SurveyForm.jsx`, each mutated with hand-written immutable-update handlers (`setX(prev => ({...prev, [key]: value}))`). No React Hook Form, no Zod/schema validation, no field-level dirty-tracking.
- **Navigation state:** a single `activeTab` string switched by button `onClick`s — not a router, so there are no deep-linkable URLs, no browser back/forward support, and no ability to bookmark or share a specific screen.
- **Offline/sync state:** `pendingCount`, `syncing`, `syncStatusText`, `justWentOnline` — all local `useState` in `App.jsx`, kept in sync with the Dexie table via the aforementioned `CustomEvent` broadcast pattern rather than any subscription/observable mechanism.

---

## 8. UX Walkthrough (as a volunteer)

1. **Open the app** → a full-screen `WelcomeScreen` appears once per calendar day (gated by a `localStorage` date-stamp), then dismisses into the main shell.
2. **Header** shows a persistent online/offline pill and, if any surveys are queued, a pending count and last-sync timestamp.
3. **Survey Form tab (default)** is one long scrolling page: Survey Info → Respondent Details → repeatable Family Members table (add/remove rows) → ~20 Yes/No/select questions with a few conditional "please specify" sub-fields → a single ID/document photo capture block → Village Infrastructure questions → Submit button at the bottom. There are no per-section "Next" steps and no progress indicator — a volunteer must scroll to see what's left.
4. **Submit** validates only 4 fields; if those pass, the whole form is serialized. If online, it goes straight to Supabase (with the photo uploaded to Storage); the form then clears itself and shows a success toast. If offline (or if the online path throws for any reason), it's silently rerouted into the local queue with a different but still reassuring toast.
5. **Offline Forms tab** lists every locally-queued survey (name, village, saved time, whether a verification doc is attached, and a static "Unsynced" badge), with **Edit** (reopens the form pre-filled) and **Delete** per row, plus a single "Sync All Pending" button that walks the queue one at a time and stops at the first failure, showing which respondent's sync failed.
6. **Reconnecting to the internet** triggers this same sync automatically in the background (a toast: "Connection Restored! You have pending surveys ready to sync"), so a volunteer doesn't strictly need to visit the Offline Forms tab at all — but they get no per-item feedback if the auto-sync stops partway.
7. **Dashboard / Analytics / Reports** (lazy-loaded, code-split) present aggregate stats and charts computed client-side over every response fetched from Supabase, and let a coordinator export branded individual PDF reports, a master tabular PDF, an XLSX register, or a CSV — all built entirely client-side with jsPDF/SheetJS, no server-rendered reports.
8. **Install banner** appears (unless already installed) prompting the volunteer to add the PWA to their home screen for a faster, more app-like offline experience.

---

## 9. Strengths — What's Well Designed and Should Be Reused

1. **The image compression algorithm** — a genuinely good two-axis (width × quality) descending search against a hard size budget, with a graceful "best effort" fallback instead of an outright failure. This logic (not the code, the *strategy*) is directly reusable for any photo-attachment feature in the new platform.
2. **Submit-time online/offline branching with automatic fallback-to-offline on any error** — a volunteer's data is never silently lost just because a network call unexpectedly failed while "online." This defensive pattern (try live insert → on any exception, fall back to local queue) is worth preserving conceptually.
3. **Dexie schema versioning** (`db.version(1|2|3).stores(...)`) as a lightweight, working example of evolving a local IndexedDB schema without wiping user data — a pattern to imitate as the new engine's local schema grows.
4. **Auto-sync on the `online` browser event**, layered on top of a manual "Sync All" button, giving both a zero-effort default and an explicit user-triggered escape hatch. Good redundancy for a rural/low-connectivity user base.
5. **Deterministic, sanitized storage paths** for uploaded files (`village_formNumber_name_docType.ext` under a date folder) — small but genuinely useful for making a Supabase Storage bucket auditable and human-searchable, not just a bag of UUIDs.
6. **Conditional field reveal-and-clear logic** ("if this Yes/No flips to No, wipe its dependent detail field") — a real, working pattern for conditional-question logic that the new dynamic engine needs to generalize.
7. **Client-side multi-format export** (PDF/XLSX/CSV) computed straight from the same data the dashboard uses, with no separate reporting backend — proves that report generation can stay entirely client-side for this scale of data.
8. **PWA installability handled properly** (`beforeinstallprompt` capture, custom banner, `appinstalled` tracking in `localStorage`) rather than relying on the browser's native, easy-to-miss install UI.

---

## 10. Weaknesses

- **The form is hardcoded, not templated.** Adding, removing, or reordering a single question requires editing a 1,663-line component and its matching Supabase column/JSON-key mapping in `supabaseClient.js`. This is the single biggest piece of technical debt and the reason a from-scratch engine, not a port, is the right call.
- **No survey/template versioning.** If the fixed 20-question form ever changes, there's no way to know which historical responses were answered against which version of the questions.
- **Validation is almost nonexistent** (4 fields out of dozens) — nothing stops a volunteer from submitting a survey where every legal-awareness answer is blank.
- **No draft-saving UX** — a volunteer can't deliberately save a half-finished survey and resume later; the only route into the offline queue is via Submit, which conflates "I'm done" with "I have no signal."
- **Sync stops entirely on first failure**, in both the auto-sync and manual-sync paths — one bad record blocks every subsequent one behind it in the queue, with no per-item error isolation, no retry, and no exponential backoff.
- **Photos are base64 data URLs stored inside the same JSON payload as everything else**, rather than as separate Blobs referenced by ID — this bloats every IndexedDB record, makes multi-photo support awkward, and risks hitting Dexie/Storage size ceilings as soon as more than one photo per survey is needed.
- **No camps, activities, or beneficiaries as entities** — "village" is a free-text string, and there is no way to link multiple surveys, or a survey and later follow-up visits, to the same real person or event over time.
- **No global state management** — cross-component sync relies on hand-fired `window` `CustomEvent`s, which works at this scale but is fragile, invisible to any dev tooling, and won't scale to a role-based (Faculty/Team Lead/Volunteer) multi-surface app.
- **No routing** — tabs are `useState`, not URLs, so nothing is deep-linkable, shareable, or back-button-friendly.
- **Silent `localStorage`-mock-database fallback** when Supabase env vars are missing is convenient for demos but a dangerous footgun if it ever activates unnoticed in a real deployment — the app will look like it's working while writing nowhere durable.
- **No automated tests, no TypeScript, no CI** — nothing catches a schema/payload mismatch before a volunteer hits it in the field.
- **No conflict resolution model** — the append-only design avoids the *hard* version of the problem, which means it also offers no template for handling out-of-order edits, duplicate submissions, or merge conflicts if the new platform ever needs update-in-place semantics.

---

## 11. Reusable Components

| Existing Feature | Verdict | Why |
|---|---|---|
| Image compression pipeline (width×quality ladder, 100 KB target) | **KEEP** (as a pattern/algorithm) | Proven, well-tuned, framework-agnostic logic; directly portable to a TS utility in the new platform. |
| Dexie/IndexedDB as offline buffer | **KEEP** (as a pattern) | Right tool for the job; new platform should still use Dexie, but with a normalized multi-table schema instead of one denormalized table. |
| Online-submit-with-offline-fallback | **KEEP** (as a pattern) | Sound defensive UX; generalize it to work for *any* entity write (survey, activity log, photo), not just surveys. |
| Auto-sync on `online` event + manual "Sync All" | **REDESIGN** | Keep the dual trigger, but replace "stop on first error" with per-item retry, error isolation, and a visible per-item status instead of an all-or-nothing queue. |
| Hardcoded survey form (`SurveyForm.jsx`) | **REPLACE** | Must become a dynamic renderer driven by a survey-template data model; no legacy question logic should be ported as-is. |
| Flat `responses` table / `survey_answers` JSON blob | **REPLACE** | Needs a proper relational model: `survey_templates`, `survey_responses`, `answers`, linked to `beneficiaries`, `camps`, `activities`. |
| Base64-data-URL photo storage inside the survey payload | **REDESIGN** | Keep client-side compression, but store photos as separate Blob-referenced records (own queue, own sync lifecycle) rather than inline in the survey JSON. |
| Manual PDF/XLSX/CSV export (jsPDF + SheetJS) | **KEEP** | Client-side export at this data scale works well and avoids a reporting backend; adapt column mapping to the new schema. |
| Tab-based navigation via `useState` | **REPLACE** | Adopt a real router so screens are deep-linkable and compatible with role-based routing (Faculty/Team Lead/Volunteer). |
| Cross-component sync via `window` `CustomEvent`s | **REPLACE** | Superseded by your existing Zustand store — no need for event-bus plumbing once a proper global store exists. |
| Hand-written service worker (stale-while-revalidate shell cache) | **KEEP** (as a pattern), consider Workbox | The strategy is sound; consider generating it via Workbox/Vite-PWA for maintainability rather than hand-rolling. |
| `localStorage` mock-DB fallback when unconfigured | **REMOVE** | Replace with a loud, visible "backend not configured" error state — never let the app silently write to a dead-end store. |
| One-photo-per-survey (verification document) model | **REPLACE** | New engine needs an N-photos-per-question or N-photos-per-activity capability, not a single slot. |
| 4-field validation only | **REPLACE** | New engine needs schema-driven, per-question-type validation (required, numeric range, regex, conditional-required). |

---

## 12. New Survey Engine Proposal

Everything below intentionally ignores the legacy code's structure and is designed for your platform's existing stack (React, TypeScript, Vite, Tailwind, Zustand, React Hook Form, Supabase).

### 12.1 Core principle
A survey is **data, not code**. A `SurveyTemplate` is a versioned JSON/relational schema describing sections and questions; the app has exactly one generic renderer (`<SurveyRunner template={...} response={...} />`) that works for every current and future survey, so adding a question is a data change, not a code deploy.

### 12.2 Data model (conceptual)

```
survey_templates
  id, name, version, status (draft/published/archived), created_by, created_at
  sections: [{ id, title, order, questions: [...] }]

survey_questions   (or embedded JSON inside the template — either works;
                     a normalized table makes cross-template analytics and
                     reuse of a "standard question library" much easier)
  id, template_id, section_id, order, type
    (text | number | single_select | multi_select | boolean |
     date | photo | signature | grid/table | conditional_group)
  label, help_text, is_required, validation_rules (JSON: min/max/regex/etc.)
  visible_if (condition referencing another question's answer — replaces
              the legacy's hardcoded "if q10=No clear q10Details")

survey_responses
  id, template_id, template_version, camp_id (FK), activity_id (FK, nullable),
  beneficiary_id (FK), collected_by (volunteer/user id),
  status (draft | submitted | under_review | approved | rejected),
  sync_status (local_only | queued | synced | conflict),
  created_at, updated_at, submitted_at, client_uuid (for idempotent upsert)

answers
  id, response_id (FK), question_id (FK), value (JSONB — typed by question.type)

survey_attachments
  id, response_id (FK), question_id (FK, nullable — or activity_id-level),
  storage_path, thumbnail_path, mime_type, size_bytes,
  local_blob_ref (IndexedDB key while offline), sync_status

beneficiaries
  id, name, contact, address, village/geo, camp_id (first-seen), created_at
  — a durable identity a person keeps across multiple surveys/visits

camps / activities   (already exist in your platform — the engine just
                       foreign-keys into them instead of duplicating village
                       as a free-text field)
```

Using a **`client_uuid` generated at creation time** (rather than relying on the DB's autoincrement/insert to define identity, as the legacy app does) is what makes offline-first sync safe: the same record can be upserted repeatedly without becoming a duplicate, which the legacy "append-only insert" model cannot do.

### 12.3 Rendering engine
- A single `<SurveyRunner>` walks `template.sections[].questions[]`, dispatching to a small library of typed field components (`TextQuestion`, `SingleSelectQuestion`, `PhotoQuestion`, `GridQuestion`, …), each wired to React Hook Form + a Zod schema **generated from `validation_rules`** — so validation is data-driven exactly like the questions themselves, closing the legacy app's biggest gap (4-field validation only).
- `visible_if` conditions drive both what's shown and what's cleared, generalizing the legacy's hand-written `if (q10==='No') updated.q10Details=''` into a reusable rule evaluator.
- A **step/section wizard with a progress bar and explicit "Save Draft"** at every step (status = `draft`), replacing the legacy's single unbroken scroll and submit-only persistence.

### 12.4 Offline-first architecture
- **Dexie/IndexedDB**, normalized to mirror the server schema: `responses`, `answers`, `attachments` tables, each row carrying `sync_status` and `client_uuid` — not one denormalized `pending_surveys` blob table.
- **Photos** compressed with the same width×quality-ladder strategy proven in the legacy app, but stored as their own attachment records with their own sync queue — decoupled from the response record so a slow photo upload never blocks the rest of a response from syncing.
- **Sync engine**: a queue processor that (a) syncs each record **independently** — one failure is isolated and retried/skipped, never blocking the rest of the queue (fixing the legacy's "stop on first error" flaw); (b) retries with exponential backoff; (c) triggers on the `online` event **and** on a periodic interval **and** on manual "Sync Now," mirroring the legacy's good dual-trigger idea but making it resilient.
- **Conflict resolution**: since `client_uuid` makes every write an idempotent upsert, the main conflict case is "same response edited on two devices while both offline." A simple, honest strategy for a small-team app like this: **last-write-wins by `updated_at`, with the losing version retained as a soft "conflict copy"** that a Team Lead/Faculty reviewer can inspect and manually reconcile — more sophisticated CRDT-style merging isn't warranted at this scale/team size.

### 12.5 Review & reporting workflow
- `status` progression `draft → submitted → under_review (Team Lead) → approved (Faculty)/rejected`, with a comments/reason field on rejection — giving the review chain your platform already implies (Team Lead, Faculty) a real home in the data model, which the legacy app has no concept of at all.
- Reports/exports reuse the legacy's proven approach (client-side jsPDF + SheetJS against whatever's currently loaded) but generated from the normalized `answers` table joined against `survey_questions.label`, so a report generator works for *any* template automatically instead of having column mappings hardcoded per survey (as `supabaseClient.js`'s `mapPayloadToRow` does today).

### 12.6 Why this satisfies every listed requirement
Offline-first (Dexie + queue) · PWA (Vite-PWA/Workbox generated shell cache, built on the legacy's proven caching strategy) · dynamic templates (schema-driven `survey_templates`) · multiple question types (typed question library) · photos (attachment table + reused compression algorithm) · beneficiaries/camp/activity linkage (proper FKs, closing the legacy's largest gap) · drafts (explicit `draft` status + wizard) · sync (independent per-record queue with backoff) · conflict resolution (client_uuid + last-write-wins + conflict-copy retention) · validation (Zod generated from `validation_rules`) · progress (section-based wizard) · Team Lead/Faculty review (status/approval chain) · report generation (client-side export, schema-driven).

---

## 13. Migration Strategy — Knowledge to Carry Forward

Nothing below is code to copy; it is a checklist of decisions and thresholds worth re-deriving deliberately in the new stack:

1. **Photo compression budget:** the legacy's tuned constants (800px max width, 100 KB target, the specific width/quality ladders) represent real field-testing against actual rural network conditions — worth using as a starting point rather than re-discovering from scratch.
2. **The "try online, silently fall back to local queue on any failure" submit pattern** — re-implement generically for any write, not just surveys.
3. **Dexie schema versioning discipline** — plan for `db.version(n).stores(...)` migrations from day one so the local schema can evolve without wiping volunteers' unsynced data.
4. **Deterministic, human-readable storage paths** for uploaded files — carry the naming convention idea (entity + date + identifiers) forward for the new attachment table.
5. **PWA install-prompt handling** (`beforeinstallprompt`/`appinstalled` custom banner) — reuse the approach, not the JSX.
6. **The specific ~20 legal-awareness questions and family-member fields** are valuable *domain content* — encode them as the **first published `survey_template`** in the new engine rather than as hardcoded fields, so the institutional knowledge of *what to ask* is preserved even though *how it's built* changes completely.
7. **Do not carry forward:** the flat single-table schema, the stop-on-first-error sync loop, the base64-inline photo storage, the `localStorage` mock-DB fallback, or the tab-as-`useState` navigation — these are the specific anti-patterns this analysis recommends against.

---

*This document is an architectural analysis only. No code was written or migrated as part of producing it, per the task constraints.*
