# Architectural Blueprint & Design Review: Survey Engine, Report Generator & Report Designer

**Author:** Principal Software Architect  
**Project:** Legal Aid Camp Management Platform (CivicForge Labs)  
**Date:** July 2026  
**Status:** Architecture Review & System Blueprint  

---

## 1. Executive Summary & Architectural Evaluation

The proposed 3-tiered architecture separating the **Survey Engine**, **Report Generator**, and **Report Designer** is **fundamentally sound, highly scalable, and architecturally correct**.

By establishing a strict separation of concerns between:
1. **Data Collection & Domain Logic** (*Survey Engine*)
2. **Data Aggregation & Business Composition** (*Report Generator*)
3. **Pure Presentation & Layout Composition** (*Report Designer*)

the platform avoids the classic monolithic trap where report layouts become tightly coupled to database schemas, SQL queries, and domain-specific enums.

```
+-----------------------------------------------------------------------------------+
|                                 CORE PLATFORM                                     |
|  (Camp Management, Volunteers, Activities, Budget, Photos, People, Narratives)    |
+----------------------------------------+------------------------------------------+
                                         |
                                         v
+-------------------------+    +-------------------+    +---------------------------+
|      SURVEY ENGINE      |    |  REPORT GENERATOR |    |      REPORT DESIGNER      |
|                         |    |                   |    |                           |
| - Form Schema / Specs   |--->| - Data Collector  |--->| - Generic Document AST    |
| - Response Capture      |    | - Aggregator      |    | - Layout Builder / Engine |
| - Individual Survey Rep |    | - AST Transformer |    | - PDF/Word/HTML Renderers |
+-------------------------+    +-------------------+    +---------------------------+
```

---

## 2. Advantages and Disadvantages Analysis

### Key Advantages
- **Strict Single Responsibility Principle (SRP):**
  - The *Survey Engine* focuses on form evaluation, validation, response collection, and individual survey rendering.
  - The *Report Generator* focuses on domain querying, statistic calculation, narrative assembly, and AST preparation.
  - The *Report Designer* focuses exclusively on layout metrics, visual widget trees, paging, and rendering formats.
- **Backend/Rendering Agnosticism:** The *Report Designer* operates on an **Intermediate Representation (Document AST)**. It does not care if the output is rendered in a React DOM web preview, a headless Puppeteer/PDF engine, or a `docxtemplater` Word export service.
- **Extensibility Across Camp Types:** Supporting Medical, Blood Donation, NSS, or NCC camps requires **zero changes** to the *Report Generator* or *Report Designer*. Only new Survey Schemas and specific Aggregation Extractors are added.

### Trade-offs & Strategic Disadvantages
- **Serialization & AST Overhead:** Transforming domain models into an intermediate Document AST introduces a compilation step. For large reports (e.g. 500+ beneficiary records, high-res photos), AST serialization in memory must be managed efficiently.
- **Contract Drift Risk:** If the schema for visual widgets in the *Report Designer* changes, the *Report Generator*'s AST transformers could break unless strict versioned contracts (e.g., Zod schemas or TypeScript types) are maintained.
- **Risk of Over-Engineering the Designer:** Building a full visual "canvas" editor from scratch can become an infinite time sink. The layout engine must remain focused on a structured flow document model (similar to Markdown/HTML layout flows) rather than an arbitrary free-form vector canvas (like Figma).

---

## 3. Module Boundaries & Responsibilities Matrix

| Attribute | Survey Engine | Report Generator | Report Designer |
| :--- | :--- | :--- | :--- |
| **Domain Awareness** | Knows forms, questions, field types, validation rules, survey responses. | Knows Camps, Activities, Budgets, Photos, Survey Aggregations, Narratives. | **Zero Domain Knowledge**. Knows only visual layout tokens, AST nodes, and styling rules. |
| **Primary Inputs** | Survey Schema Definition, Respondent Submissions. | Camp ID, Date Range, Selected Modules, Aggregation Filters. | Document AST (`ReportDocumentAST`), Theme Tokens, Target Output Format. |
| **Primary Outputs** | Response Records, Individual Survey Report (PDF/HTML). | Compiled Document AST (`ReportDocumentAST`). | Rendered HTML Canvas, Pixel-Perfect PDF, Downloadable Word (`.docx`). |
| **Persistence** | `survey_definitions`, `survey_responses`, `survey_answers`. | `report_configurations`, `report_snapshots`. | None (Pure functional layout engine). |

---

## 4. Deep Dive: Package Boundaries & Reusability

### 4.1 Should the Survey Engine be a Package?
**Architectural Recommendation: YES (Internal Monorepo Package `@lacp/survey-engine`)**

#### Rationale:
The requirement states that the Survey Engine will eventually support Medical, Blood Donation, NSS, and NCC programs. 
If the Survey Engine is embedded directly inside `src/features/surveys`, it will inevitably leak Legal Aid Camp platform dependencies (such as specific Camp tables or Law School terminology).

#### Recommended Package Contract:
- **Core Engine Package (`@lacp/survey-engine`):** Contains the JSON Schema evaluator, question types (radio, checkbox, text, rating, geo-location), validation rules, and response parser.
- **Application Integration (`src/features/camps/surveys`):** Binds `@lacp/survey-engine` to the `camp_id` and `volunteer_id` in the main database.

---

### 4.2 Should the Report Designer be Reusable Outside This Project?
**Architectural Recommendation: YES (Standalone Package `@civicforge/document-renderer` or `@lacp/report-designer`)**

#### Rationale:
The *Report Designer* is specified as a **generic visual document engine** that accepts widget trees (`Heading`, `Paragraph`, `Image`, `Gallery`, `Table`, `Statistic Card`, `Timeline`).

By keeping it completely isolated from business logic:
1. It can be developed, unit-tested, and visually benchmarked using a isolated Storybook workbench without spinning up Supabase or application state.
2. It can be reused across future CivicForge Labs initiatives (e.g., University Accreditation Reports, Health Camp Summaries, NGO Audits).

---

## 5. Extensibility Blueprint: Multi-Domain Surveys & Multi-Format Generation

### 5.1 Multi-Domain Survey Definition Schema
To support multi-domain programs without changing the database schema, survey definitions must be schema-driven JSON objects:

```json
{
  "id": "survey_legal_clinic_2026",
  "version": "1.0.0",
  "domain": "LEGAL_AID",
  "title": "Legal Services Clinic Survey 2026-27",
  "sections": [
    {
      "id": "sec_demographics",
      "title": "Beneficiary Profile",
      "questions": [
        {
          "id": "q_gender",
          "type": "SINGLE_SELECT",
          "label": "Gender",
          "options": ["Male", "Female", "Other", "Prefer not to say"]
        }
      ]
    }
  ]
}
```

### 5.2 Document AST (Intermediate Representation)
The *Report Generator* translates camp data into a strongly typed **Document AST** that the *Report Designer* renders:

```typescript
export interface ReportDocumentAST {
  meta: {
    title: string;
    preparedFor: string;
    generatedAt: string;
    theme: { primaryColor: string; fontFamily: string };
  };
  sections: Array<{
    id: string;
    title: string;
    widgets: ReportWidgetAST[];
  }>;
}

export type ReportWidgetAST =
  | { type: 'HEADING'; level: 1 | 2 | 3; text: string }
  | { type: 'PARAGRAPH'; text: string; align?: 'left' | 'center' | 'justify' }
  | { type: 'STAT_CARD'; label: string; value: string | number; trend?: string }
  | { type: 'TABLE'; headers: string[]; rows: (string | number)[][] }
  | { type: 'GALLERY'; images: Array<{ url: string; caption: string }> }
  | { type: 'TIMELINE'; events: Array<{ date: string; title: string; description: string }> };
```

---

## 6. Identification of Architectural Risks & Overlooked Factors

### 1. Offline & Mobile Survey Capture (Critical Overlook)
* **Risk:** Legal aid camps often take place in remote rural locations with zero or weak cellular connectivity. Volunteers collecting survey responses will experience network drops.
* **Mitigation:** The Survey Engine must support an **Offline Response Buffer** (using IndexedDB/LocalForage) with background sync capabilities when internet connectivity is restored.

### 2. Schema Drift & Survey Response Immutability
* **Risk:** If a survey definition is modified halfway through an academic year, existing response records may fail validation or break historical report generation.
* **Mitigation:** Survey definitions must be **immutable**. Updating a survey creates a new `version` (e.g. `1.0.0` -> `1.1.0`). Responses must store the exact `survey_definition_id` and `version` they were collected under.

### 3. PDF/Word Rendering Parity
* **Risk:** Web preview (DOM/HTML) rendering will look different from generated PDF or Word (`.docx`) documents due to browser font rendering and page-break rules.
* **Mitigation:** The *Report Designer* must implement a unified **Layout Engine Spec** that enforces page constraints (e.g., A4 pagination limits, explicit orphan/widow paragraph rules) across HTML, PDF (via Puppeteer/CSS Paged Media), and `.docx` generation.

### 4. PII & Sensitive Beneficiary Anonymization
* **Risk:** Legal aid surveys collect sensitive legal disputes, domestic complaints, and economic details. Indiscriminate aggregation in institutional reports could violate privacy policies.
* **Mitigation:** The *Report Generator* must enforce an automatic **Anonymization Layer** that strips personal identifying data (Names, Phone Numbers, Aadhaar IDs) before passing survey statistic tables to the *Report Designer*.

---

## 7. Final Recommendation & Architectural Verdict

1. **Approve 3-Tier Architecture:** The boundary separation between *Survey Engine*, *Report Generator*, and *Report Designer* is optimal and approved.
2. **Standardize Document AST:** Define a strict TypeScript/Zod schema for `ReportDocumentAST` before building the Report Generator or Report Designer.
3. **Decouple Packages:** Structure `@lacp/survey-engine` and `@lacp/report-designer` as modular packages within the codebase repository.
4. **MVP Boundary Control:** Keep the Survey Builder UI disabled for MVP as planned, using JSON-based pre-built definitions (`Legal Services Clinic Survey 2026–27`).
