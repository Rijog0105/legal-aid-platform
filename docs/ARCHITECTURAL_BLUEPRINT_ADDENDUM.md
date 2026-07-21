# Architecture Addendum: Module Ownership & Report Boundary Evaluation

**Author:** Principal Software Architect  
**Project:** Legal Aid Camp Management Platform (CivicForge Labs)  
**Date:** July 2026  
**Status:** Architectural Addendum & Refinement  

---

## 1. Architectural Review of New Principles

### 1.1 Report Responsibility Classification
The proposed classification into three distinct report tiers is **highly logical and approved**:

```
+-----------------------------------------------------------------------------------+
|                                 REPORT CLASSIFICATION                             |
+--------------------------+------------------------------+-------------------------+
| A. Individual Reports    | B. Consolidated Reports      | C. Composite Reports    |
| (Single Entity Execution)| (Single Domain Aggregation)  | (Cross-Module Assembly) |
|                          |                              |                         |
| Owned by:                | Data Owned by:               | Data Owned by:          |
| Survey Engine            | Originating Module           | Report Generator        |
|                          | (e.g. Survey, Budget)        | (Queries Domain Summaries)|
+--------------------------+------------------------------+-------------------------+
```

* **Type A (Individual Survey Report):** Fully owned by Survey Engine. It is an extension of the response submission record itself.
* **Type B (Consolidated Single-Domain Reports):** Data extraction, statistics, CSV/Excel exports, and domain analytics are owned by the respective module (Survey, Budget, Attendance).
* **Type C (Composite Reports):** Fully owned by the Report Generator. The Report Generator queries summary contracts from individual modules and composes a cross-domain report.

---

### 1.2 Evaluation of the Module Ownership Principle

#### Proposed Rule:
> *"Every module owns both its data and every report that can be generated solely from that data."*

#### Architectural Assessment: **Strong Agreement on Data Ownership; Partial Refinement on Visual Rendering.**

* **Where we AGREE:**
  A module must strictly own its data queries, mathematical aggregations, and tabular exports (CSV/Excel). For instance, the `Budget Module` is best equipped to calculate budget variances and format CSV exports. The `Report Generator` should **never** directly query `budget_items` or `survey_answers` SQL tables.

* **Where we CHALLENGE / REVISE (The Presentation Separation Exception):**
  While a module owns *what* data goes into a Consolidated Report, it should **not** implement its own custom PDF or visual layout rendering engine. 
  
  If the `Survey Engine`, `Budget Module`, and `Attendance Module` each write ad-hoc HTML-to-PDF or canvas rendering code for their single-module PDF reports, the system will suffer from visual inconsistency, duplicated styling, and fragmented export infrastructure.

#### Architectural Principle Refinement:
> **Refined Rule:** *"Every module owns its data models, domain aggregations, and data exports (CSV/Excel). For visual document reports (PDF/Print), single-domain modules act as Data Providers that emit a Document AST to the shared **Report Designer**."*

```
Single Domain Module (e.g. Budget)
  |-- Data Query & Aggregation (Module Owned)
  |-- CSV / Excel Export (Module Owned)
  |-- Visual PDF Report ---> Generates Single-Module AST ---> Report Designer Engine (Shared Renderer)
```

---

### 1.3 Survey Engine as a Reusable Product & MVP Boundaries

#### Assessment: **Strong Agreement & Best-Practice Validation.**

Hiding the Survey Builder UI in MVP while maintaining internal multi-tenant/schema-driven capabilities is an exemplary MVP scoping decision.

#### Critical Implementation Safeguards:
1. **Zero Domain Pollution:** The Survey Engine database tables must be strictly domain-neutral:
   - Use `survey_definitions`, `survey_questions`, `survey_responses`, `survey_answers`.
   - **Do NOT** add `camp_id` directly inside `survey_definitions`. Instead, use a join entity `camp_surveys(camp_id, survey_definition_id)` in the main application.
2. **Static JSON Schema Seeding:** The MVP survey (`Legal Services Clinic Survey 2026–27`) should be loaded via a migration/seed file as `survey_definitions` ID `survey_legal_clinic_2026_v1`.

---

### 1.4 Report Designer Pure Isolation

#### Assessment: **100% Agreement.**

The Report Designer must remain a **pure functional presentation component**. It accepts a JSON Document AST and outputs an HTML canvas or PDF stream.

#### Architectural Guarantee:
```typescript
// Report Designer Interface (Pure & Stateless)
export interface ReportDesignerProps {
  document: ReportDocumentAST;
  theme?: DocumentTheme;
  mode?: 'preview' | 'print' | 'pdf_stream';
}
```
If the Report Designer contains a single `import { Camp } from '@/features/camps'`, the boundary has been violated and must be rejected during code review.

---

## 2. Updated End-to-End Composite Data Flow

```
+------------------+    +-------------------+    +--------------------+
|  Survey Engine   |    |   Budget Module   |    | Attendance Module  |
+--------+---------+    +---------+---------+    +---------+----------+
         |                        |                        |
         | getSummary(campId)     | getSummary(campId)     | getSummary(campId)
         v                        v                        v
+---------------------------------------------------------------------+
|                          REPORT GENERATOR                           |
|                                                                     |
| 1. Collects module summaries via explicit TypeScript interfaces     |
| 2. Merges Camp Narratives & Photos                                  |
| 3. Compiles Composite AST: ReportDocumentAST                        |
+----------------------------------+----------------------------------+
                                   |
                                   | ReportDocumentAST
                                   v
+---------------------------------------------------------------------+
|                           REPORT DESIGNER                           |
|                                                                     |
| - Pure layout engine                                                |
| - Renders Heading, Paragraph, StatCard, Table, Gallery, Timeline    |
| - Outputs: Web Preview / PDF / Word (.docx)                         |
+---------------------------------------------------------------------+
```

---

## 3. Risk Matrix & Mitigations

| Risk | Cause | Architectural Mitigation |
| :--- | :--- | :--- |
| **Data Query Coupling** | Report Generator writing raw SQL across module boundaries. | Enforce strict `ModuleSummaryProvider` TypeScript interfaces for each feature module. |
| **Layout Fragmentation** | Feature modules building their own custom PDF generators. | Single-module PDF reports must emit AST nodes to the central Report Designer. |
| **Page-Break Overflow** | Large survey tables or picture galleries clipping across A4 pages in PDF export. | Implement CSS Paged Media rules (`break-inside: avoid;`) inside the Report Designer primitives. |

---

## 4. Final Summary of Architectural Addendum

1. **Approved**: 3-Tier Report Classification (Individual vs Consolidated vs Composite).
2. **Approved**: Survey Engine MVP scoping (No Builder UI; JSON Schema driven).
3. **Approved**: Complete isolation of the Report Designer as a generic visual renderer.
4. **Refined**: Module Ownership Principle clarified so that single-domain modules own their **data and aggregations**, but delegate visual PDF layout to the shared **Report Designer AST engine**.
