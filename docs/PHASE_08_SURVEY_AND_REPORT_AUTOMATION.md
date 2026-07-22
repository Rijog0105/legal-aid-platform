# Phase 8 — Survey & Report Automation

> Authoritative Master Architectural Planning & Implementation Document for Phase 8.

---

## 1. Objective

The objective of Phase 8 is to complete the remaining end-to-end MVP functionality required for the Legal Aid Camp Management Platform prior to production deployment. 

Bridging field data collection with institutional report generation, Phase 8 enables volunteers to submit structured legal aid beneficiary surveys during camps, allows Team Leads and Faculty to track collection metrics in real time, and automates the compilation of individual survey outputs, consolidated statistical digests, and comprehensive institutional PDF camp reports.

---

## 2. Scope

### In-Scope (Version 1 MVP)

- **Hardcoded Beneficiary Survey Form**: Clean, mobile-optimized digital survey form matching the university's official legal aid beneficiary questionnaire format.
- **Volunteer Field Submission**: Offline-resilient/responsive survey entry for assigned volunteers, automatically associated with the active camp, volunteer user ID, and timestamp.
- **Real-Time Survey Dashboards**: 
  - *Team Lead Dashboard*: Real-time count of forms collected, progress by volunteer, and submission feed.
  - *Faculty Dashboard*: Aggregate survey metrics, response distribution counts, and camp-wide completion status.
- **Individual Survey Report PDF**: Single-beneficiary survey document rendering formatted answers, respondent demographics, and legal aid request details.
- **Consolidated Survey Report PDF**: Statistical summary report compiling camp-wide beneficiary demographics, key legal issues identified, and quantitative charts/tables.
- **Final Camp Report Generation**: Comprehensive institutional PDF compiling Camp Overview, Assigned Delegation Roster, Executed Activities Agenda, Curated Photo Documentation, Budget & Financial Summary, Consolidated Survey Statistics, and Executive Narrative Sections.
- **Report Preview & Downloads**: Secure browser preview and PDF download for all generated reports.

### Out-of-Scope (Postponed to Version 2)

- Generic Drag-and-Drop Survey Engine
- Standalone Visual Survey Form Designer
- Dynamic Survey Question / Schema Builder
- Generic Multi-Format Report Builder
- Custom Report Template Builder
- Custom Variable / Placeholder Expansion Engine

---

## 3. Architecture Decision

### Decision: V1 MVP Focus vs. V2 Reusable Platform

To guarantee on-time deployment for university field operations, **Version 1 prioritizes shipping a fully working, production-ready product over generic abstractions**. 

The complex generic engines originally proposed (Survey Engine, Visual Designer, Generic Report Builder) have been intentionally postponed to Version 2. For Version 1, all survey form fields, statistical aggregation logic, and report layouts are hardcoded to conform directly to the university's finalized legal aid camp standards.

### Rationale

1. **Production Readiness & Timeline**: Building a fully generic visual survey designer and dynamic report engine introduces significant scope bloat, postponing the primary operational goal: enabling legal aid camps.
2. **Fixed Domain Requirements**: The university's legal aid camp survey questions and institutional report formats are standardized by academic regulations and do not change between individual camps.
3. **Data Integrity**: Hardcoded schemas prevent field validation errors, schema drift, and data corruption during active field operations.

---

## 4. Phase Breakdown

```
Phase 8A: Survey Form
      │
      ▼
Phase 8B: Survey Persistence
      │
      ▼
Phase 8C: Survey Dashboards
      │
      ▼
Phase 8D: Individual Survey PDF
      │
      ▼
Phase 8E: Consolidated Survey PDF
      │
      ▼
Phase 8F: Final Camp Report Generation
```

---

### Phase 8A: Survey Form

- **Purpose**: Build the responsive, user-friendly digital survey form representing the official beneficiary questionnaire.
- **Deliverables**:
  - `BeneficiarySurveyForm.tsx`: Component with field validation for demographics, legal assistance category, income level, and description of issue.
  - `VolunteerSurveyPage.tsx`: Mobile page wrapping the form for volunteers on field duty.
- **Dependencies**: Existing `useAuth` hook and active camp resolution.
- **Completion Criteria**: Form renders cleanly on desktop and mobile viewports with full client-side validation.

---

### Phase 8B: Survey Submission & Persistence

- **Purpose**: Persist completed survey responses to Supabase PostgreSQL with RLS protection.
- **Deliverables**:
  - `surveyService.ts`: Service methods (`submitSurvey()`, `fetchSurveysByCamp()`, `fetchSurveyById()`).
  - `useSurveys.ts`: React hook managing survey state, submission, and reloading.
  - Database schema alignment for `public.surveys` and response details.
- **Dependencies**: Phase 8A completion; existing `public.camps` and `public.users` tables.
- **Completion Criteria**: Volunteers can successfully submit surveys in the field; records persist reliably with correct `camp_id` and `submitted_by` foreign keys.

---

### Phase 8C: Survey Dashboards

- **Purpose**: Provide real-time visibility into survey collection progress for Team Leads and Faculty.
- **Deliverables**:
  - `TeamLeadSurveysPage.tsx`: Displays live form counts, team member collection breakdown, and recent submission feed.
  - `SurveysTab.tsx`: Faculty camp detail tab displaying aggregate metrics, statistical breakdowns, and response tables.
- **Dependencies**: Phase 8B completion; `useSurveys.ts` hook.
- **Completion Criteria**: Team Leads and Faculty see accurate, live survey metrics for their respective camps.

---

### Phase 8D: Individual Survey Report

- **Purpose**: Generate a formatted, print-ready document for a single beneficiary survey response.
- **Deliverables**:
  - `IndividualSurveyPDF.tsx` / `surveyPdfService.ts`: PDF rendering template for single survey responses.
  - Download / View action buttons in survey tables.
- **Dependencies**: Phase 8C completion; HTML-to-PDF compilation utility (`html2pdf.js` or `jspdf`).
- **Completion Criteria**: Users can click any survey entry to view and download a styled PDF copy of the submission.

---

### Phase 8E: Consolidated Survey Report

- **Purpose**: Aggregate all beneficiary survey data for a camp into an institutional summary report.
- **Deliverables**:
  - `ConsolidatedSurveyReport.tsx`: Aggregated statistics layout (total respondents, category breakdown percentages, demographic metrics).
  - Consolidated Survey PDF generator method in `surveyPdfService.ts`.
- **Dependencies**: Phase 8D completion.
- **Completion Criteria**: Faculty can generate and download a consolidated statistical report summarizing all surveys collected during a camp.

---

### Phase 8F: Final Camp Report Generation

- **Purpose**: Compile all camp data modules into a master institutional legal aid camp report.
- **Deliverables**:
  - `ReportPreparationTab.tsx` integration: Full compilation pipeline binding Overview, Delegation Roster, Activities, Photo Documentation, Budget Summary, Consolidated Survey Stats, and Executive Narratives.
  - `reportGeneratorService.ts`: Master PDF compiler generating the complete institutional document.
  - `ReportViewerModal.tsx`: In-browser PDF preview and download component.
- **Dependencies**: Phase 8E completion; existing `PhotosTab`, `BudgetTab`, `ActivitiesTab`, and `CampPeopleTab`.
- **Completion Criteria**: Faculty can preview and download the finalized multi-page Camp Report with 100% data fidelity.

---

## 5. Implementation Order

```
[Phase 8A: Form UI] ──► [Phase 8B: Persistence] ──► [Phase 8C: Dashboards]
                                                              │
[Phase 8F: Final Master Report] ◄── [Phase 8E: Summary PDF] ◄── [Phase 8D: Individual PDF]
```

Each sub-phase builds strictly on the deliverables of the preceding sub-phase, ensuring incremental verification at every step.

---

## 6. Existing Components & Services to Reuse

Phase 8 will directly consume the following verified codebase infrastructure:

| Category | Component / Module | Reuse Purpose |
| :--- | :--- | :--- |
| **Pages & Views** | `CampDetailPage.tsx` | Hosts `SurveysTab` (`activeTab === 'surveys'`) and `ReportPreparationTab` (`activeTab === 'report'`). |
| **Report Workspace** | `ReportPreparationTab.tsx` | Serves as the control center for compiling master camp reports. |
| **Photo Module** | `PhotosTab.tsx` / `photoService.ts` | Supplies report-selected photos (`is_selected_for_report = true`) with signed URLs for report inclusion. |
| **Budget Module** | `BudgetTab.tsx` / `expenseService.ts` | Supplies financial metrics and expense line items for the report budget section. |
| **Activity Module** | `ActivitiesTab.tsx` / `activityService.ts` | Supplies executed activity agenda items for report inclusion. |
| **People Roster** | `CampPeopleTab.tsx` / `campPeopleService.ts` | Supplies faculty, team lead, and volunteer delegation roster details for the report. |
| **Auth & RBAC** | `useAuth.ts` / `ProtectedRoute.tsx` | Provides `userId`, `personId`, `roleName`, and role-gated navigation for all survey routes. |
| **Database** | `public.surveys` table | Primary persistence table for survey submissions. |
| **Storage** | `camp-reports` storage bucket | Storage location for generated PDF report artifacts. |

---

## 7. Legacy Prototype Mapping

| Legacy Feature | Old Prototype Behavior | New Platform Implementation |
| :--- | :--- | :--- |
| **Form Collection** | Standalone unauthenticated web form | Authenticated, volunteer-linked submission associated with active camp context. |
| **Submission Feed** | Unstructured JSON array in local storage | Relational PostgreSQL persistence with RLS, foreign keys, and indexed queries. |
| **Survey Analytics** | Basic static HTML charts | Dynamic statistical breakdown components integrated into Faculty & Team Lead workspaces. |
| **Individual Output** | Plain text print dialog | Styled, institutional PDF rendering with print-ready typography and headers. |
| **Report Compilation** | Manual copy-paste into Word document | 1-Click automated master PDF generation merging all 7 camp data modules. |

---

## 8. Implementation Risks & Mitigations

1. **Survey Form Field Mismatch**:
   - *Risk*: Discrepancy between field survey input options and institutional statistical report categories.
   - *Mitigation*: Hardcode standardized dropdown enum choices matching exact institutional reporting categories.
2. **PDF Pagination & Page Breaks**:
   - *Risk*: Content overflow causing awkward page splits across photo grids or budget tables in generated PDFs.
   - *Mitigation*: Enforce explicit CSS page-break rules (`page-break-inside: avoid`) in report templates.
3. **Large Image Memory Overhead**:
   - *Risk*: High-resolution photo documentation exceeding browser memory limits during PDF compilation.
   - *Mitigation*: Utilize optimized signed URLs and compressed image elements in the PDF rendering DOM.
4. **Data Completeness**:
   - *Risk*: Attempting to generate a final report before mandatory modules (e.g. photos or activities) have entries.
   - *Mitigation*: `ReportPreparationTab` provides real-time readiness indicators highlighting incomplete sections.

---

## 9. Acceptance Criteria

Phase 8 is considered 100% complete when all of the following objective criteria are verified:

1. **Survey Collection**: Volunteers can open the survey form on mobile, fill in beneficiary details, and submit records successfully.
2. **Survey Persistence**: Submitted surveys appear immediately in database queries and Team Lead / Faculty survey dashboards.
3. **Individual PDF Download**: Users can generate and download a clean PDF for any single beneficiary survey response.
4. **Consolidated PDF Download**: Faculty can generate a camp-wide survey statistical digest PDF.
5. **Master Report Compilation**: Clicking "Generate Final Report" in `ReportPreparationTab` compiles all 7 camp modules into a complete, institutional PDF document.
6. **Zero Build Errors**: `npm run build` succeeds cleanly with 0 TypeScript or bundling errors.

---

## 10. Future Enhancements (Version 2)

The following advanced features are explicitly designated for Version 2:

- **Generic Drag-and-Drop Survey Engine**: Visual form builder allowing non-technical admins to create custom survey forms.
- **Dynamic Field Schema Builder**: Custom field definitions (text, select, checkbox, rating) stored in JSONB schemas.
- **Generic Report Designer**: Visual template builder with drag-and-drop report sections.
- **Dynamic Variable System**: Custom placeholder replacement engine for arbitrary document generation.
- **Multi-Format Export**: Exporting raw survey and report data to Excel (.xlsx) and Word (.docx).
