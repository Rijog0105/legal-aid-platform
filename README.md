# Legal Aid Camp Documentation & Report Automation Platform

> Reduce administrative effort in camp documentation and automate institutional report generation for university legal services clinics.

---

## 🌟 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 · TypeScript · Vite · Tailwind CSS v4 |
| UI Components | Radix UI · Lucide Icons · Framer Motion · Recharts |
| Forms | React Hook Form · Zod |
| Backend & Database | Supabase (PostgreSQL, Auth, Storage, RLS) |
| Report Generation | jsPDF · html2canvas · docxtemplater |

---

## ✨ Key Features & Capabilities

### 📄 Official 8-Page Bilingual Legal Aid Survey Engine
- Exact digitization of the official paper ***DATA COLLECTION SHEET (ವಿವರ ಸಂಗ್ರಹಣಾ ನಮೂನೆ)***.
- Supports bilingual English & Kannada headers, family roster grids, socio-economic questions (Q1–Q8), document non-availability matrices (Ration Card, Aadhar, Pensions, UDID, Ayushman), and vulnerability sections (Q9–Q21).
- Connected directly to faculty-assigned projects with pre-filled camp locations.

### 📍 Mandatory Photo Verification with Live GPS Geolocation
- Mandatory location proof photo upload required prior to survey submission.
- Integrated HTML5 Geolocation API (`navigator.geolocation`) capturing live GPS coordinates (`latitude`, `longitude`) and ISO timestamps.
- Client-side HTML5 Canvas image compression (5MB $\rightarrow$ ~40KB), preventing browser storage quota limits.
- Automatic sync of proof photos into the Volunteer **My Works (Personal Gallery / Submissions)** tab.

### 📊 3-Tier Automated Report Generation Engine
1. **Individual Survey Report (Type A)**: Auto-generated immediately upon survey submission with print (`window.print()`) & PDF download controls. Includes full paper questionnaire responses and verified proof photo with GPS geotags.
2. **Consolidated Survey Report (Type B)**: Faculty statistical digest aggregating document non-availability matrices, amenities availability, and pending litigation counts.
3. **Legal Aid Camp Master Report (Type C)**: Comprehensive institutional report combining camp activities, narrative sections, budget line items, photo galleries, and survey analytics.

### 👤 Role-Based Workspaces & Portals
- **Faculty Control Center** (`/dashboard`): Camp lifecycle transitions, project assignments, narrative editors, budget tracking, and multi-report generation dashboard.
- **Volunteer Workspace** (`/volunteer`): Mobile-first field interface for conducting surveys, capturing activity photos, and accessing **My Individual Reports** (`/volunteer/reports`).
- **Team Lead Workspace** (`/team-lead`): Leadership portal for field curation, activity oversight, and photo approvals.

---

## 🚀 Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/CivicForgeLabs/legal-aid-camp-platform.git
cd legal-aid-camp-platform

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env

# 4. Start development server
npm run dev

# 5. Build for production
npm run build
```

---

## 📁 Project Structure

```
src/
├── app/              # App root, router, providers
├── components/       # Shared UI components & layout (AppShell, VolunteerLayout)
├── constants/        # Survey questions, routes, and constants
├── features/         # Feature modules
│   ├── auth/         # Authentication & RBAC hooks
│   ├── projects/     # Project & camp management
│   ├── survey/       # 8-Page Legal Aid Survey Engine & questionnaire
│   ├── reports/      # Individual, Consolidated, and Camp Master Reports
│   ├── volunteer/    # Photo capture, My Works gallery, photo service
│   └── people/       # People registry
├── services/         # Supabase client, survey service, report calculations
├── types/            # TypeScript type definitions (survey, project, photo)
└── pages/            # Page components and role launchpads
```

---

## 📋 Development Roadmap & Status

- [x] **Phase 1**: Project Setup, Auth, Database Schema
- [x] **Phase 2**: Authentication & Role-Based Protected Routes
- [x] **Phase 3**: People Registry
- [x] **Phase 4**: Camp Management & Lifecycle
- [x] **Phase 5**: Activity Management & Drag-and-Drop Reordering
- [x] **Phase 6**: Photo Documentation & GPS Geolocation Tagging
- [x] **Phase 7**: Budget & Narrative Sections
- [x] **Phase 8**: Official 8-Page Legal Aid Survey Engine & 3-Tier Report System
- [x] **Phase 9**: Dashboard, Polish & Production Readiness

---

## 📄 License

MIT © CivicForge Labs
