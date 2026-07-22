# Phase 6 — Photo Documentation & Volunteer Experience

> Historical implementation record and authoritative status for Phase 6.

---

## Objective

Build the field photo capture and curation workflow — bridging volunteer ground operations with faculty report curation. Volunteers capture activity photos (with geolocation metadata and camera/upload support) on mobile, view their submitted gallery, and faculty review, filter, curate, and toggle photos for inclusion in automated institutional reports.

---

## Scope

- Volunteer active camp resolution and per-activity photo capture.
- Device camera integration with geolocation tagging.
- Volunteer submission history (`MySubmissionsPage`).
- Storage object upload and signed URL resolution for private `camp-photos` bucket objects.
- Faculty photo review grid (`PhotosTab`) integrated into `CampDetailPage`.
- Faculty report photo selection toggle (`is_selected_for_report`) and photo deletion.
- Team Lead pre-review photo curation (`TeamLeadPhotosPage`).

---

## Features Implemented

1. **Volunteer Mobile Capture Page (`VolunteerCapturePage`)**
   - Active camp assignment context resolution.
   - Activity dropdown selection with real-time per-activity photo limit counter.
   - Device camera capture / photo picker trigger with client-side size validation (<10MB).
   - Browser Geolocation API capture for GPS coordinates (`latitude`, `longitude`).
   - Optimistic upload state handling and recent activity thumbnail list.

2. **Volunteer Personal Gallery (`MySubmissionsPage`)**
   - Grid view of all photos captured by the current volunteer for the active camp.
   - Embedded activity names and capture timestamps.

3. **Faculty Photo Review & Curation (`PhotosTab`)**
   - Integrated into `CampDetailPage`'s "Photos" tab.
   - Photo counter bar (Total Photos vs. Selected for Report count).
   - Filter by Activity and filter by Report Selection status (All, Selected, Unselected).
   - Responsive photo card grid with signed image preview, activity badge, uploader full name, timestamp, and GPS badge.
   - One-click report inclusion toggle (`is_selected_for_report`).
   - Photo deletion modal and operation (deletes DB record and removes storage object).

4. **Private Storage & Signed URL Handling**
   - Automatic short-lived signed URL generation (`getSignedPhotoUrl`) for private `camp-photos` bucket assets.
   - Fallback error rendering (`ImageOff`) for missing/expired images.

---

## Components Created

- `VolunteerCapturePage.tsx` — Mobile photo capture interface.
- `MySubmissionsPage.tsx` — Volunteer submission history gallery page.
- `ActivitySelector.tsx` — Dropdown selector for active camp activities.
- `PhotoCounter.tsx` — Per-activity photo count vs. max limit indicator.
- `PhotoThumbnail.tsx` — Signed URL image loader component with fallback state.
- `PhotoLightboxModal.tsx` — Full-resolution uncropped image preview modal with metadata overlay.
- `PhotosTab.tsx` — Faculty photo review, filter, report toggle, and management tab.
- `TeamLeadPhotosPage.tsx` — Team Lead pre-review photo curation workspace.

---

## Hooks Created

- `useMyCampAssignment.ts` — Resolves the active camp assignment for a volunteer person ID.
- `useActivityPhotos.ts` — Fetches photos captured by a volunteer for a specific activity.
- `useMyPhotos.ts` — Fetches all photos captured by a volunteer for a camp.
- `useCampPhotos.ts` — Fetches all photos for a camp (with activity and uploader details) for faculty review, providing toggle and remove actions.

---

## Services Created / Extended

- `photoService.ts`
  - `uploadPhoto()` — Uploads file to Supabase Storage `camp-photos` bucket and creates database record in `photos`.
  - `fetchMyPhotosForActivity()` — Fetches volunteer photos for a specific activity.
  - `fetchMyPhotos()` — Fetches volunteer photos for a camp with activity names.
  - `getSignedPhotoUrl()` — Obtains short-lived signed URLs for storage paths.
  - `fetchCampPhotos()` — Fetches all camp photos with uploader and activity details.
  - `togglePhotoReportSelection()` — Updates `is_selected_for_report` flag.
  - `deletePhoto()` — Removes storage file and deletes `photos` table record.
- `volunteerService.ts`
  - `fetchMyActiveCampAssignment()` — Resolves active camp for volunteer.

---

## UI Additions

- Volunteer navigation sub-routes in `src/app/routes.tsx`:
  - `/volunteer/capture` → `VolunteerCapturePage`
  - `/volunteer/submissions` → `MySubmissionsPage`
- `PhotosTab` wired into `CampDetailPage` under the "Photos" tab.
- Module barrel export created in `src/features/volunteer/index.ts`.

---

## Database & Storage Architecture

- Uses `public.photos` table defined in `001_complete_schema.sql`.
- Interacts with private `camp-photos` Supabase Storage bucket.
- Storage RLS policies defined in `supabase/migrations/004_photo_storage_policies.sql`.

---

## Build Verification

- `npx tsc --noEmit`: Verified 0 errors.
- `npm run build`: Production bundle generated successfully.

---

## Post-Implementation Refinements

### 1. Volunteer Capture Workflow
- **Workflow Streamlining**: Eliminated the redundant second click in the photo capture process.
  - *Previous Workflow*: Select Activity $\rightarrow$ Navigate $\rightarrow$ Select Activity Again $\rightarrow$ Click Take Photo $\rightarrow$ Open Camera.
  - *Refined Workflow*: Select Activity $\rightarrow$ Click Camera $\rightarrow$ Automatically launch file picker (Desktop) or device camera (Mobile).
  - **State Preservation**: Passing `selectedActivity` and `autoTrigger: true` via `location.state` preserves the active selection across navigation boundaries.

### 2. Photo Upload Infrastructure
- **Finalized Infrastructure**:
  - Private Supabase Storage bucket (`camp-photos`).
  - Storage RLS policies on `storage.objects` restricting access to authenticated users.
  - Secure authenticated file uploads and time-limited signed URL retrieval.
  - **Migration Cleanliness**: Storage policies were isolated into `supabase/migrations/004_photo_storage_policies.sql` to maintain clean, single-concern migration history.

### 3. Gallery Improvements
- **Responsive CSS Grid Layout**: Transformed photo listings into responsive thumbnail galleries (`grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3`).
- **Thumbnail Presentation**: Uniform 1:1 square thumbnails with rounded corners (`rounded-xl`) and subtle hover states.
- **Click-to-Preview Lightbox**: Added `PhotoLightboxModal.tsx` across Faculty, Team Lead, and Volunteer workspaces, allowing users to view full-resolution, uncropped images without distortion alongside complete metadata overlays.

### 4. Security Improvements
- **Storage Row-Level Security (RLS)**: Enforced strict policies on `storage.objects` for the `camp-photos` bucket:
  - `auth_users_upload_photos`: Authenticated `INSERT` permission.
  - `auth_users_read_photos`: Authenticated `SELECT` permission.
  - `auth_users_delete_photos`: Authenticated `DELETE` permission.
- **Private Bucket Architecture**: Public access to `camp-photos` is disabled (`public = false`); all image rendering requires authenticated signed URL generation.

### 5. Implementation Completion Status
- **Status**: **Phase 6 implementation is now functionally complete.**
- **Next Steps**: Remaining tasks consist solely of future UI micro-polish and staging deployment/mobile device testing.

### 6. Files Modified During Refinement Pass
- `src/pages/VolunteerHomePage.tsx`
- `src/features/volunteer/components/VolunteerCapturePage.tsx`
- `src/features/volunteer/components/PhotoThumbnail.tsx`
- `src/features/volunteer/components/PhotoLightboxModal.tsx` *(New)*
- `src/features/volunteer/components/PhotosTab.tsx`
- `src/features/volunteer/components/TeamLeadPhotosPage.tsx`
- `src/features/volunteer/components/MySubmissionsPage.tsx`
- `supabase/migrations/004_photo_storage_policies.sql` *(New)*

### 7. Lessons Learned & Architectural Decisions
- **UUID-Based Storage Hierarchy**: Storage paths use structural UUID paths (`{camp_id}/{activity_id}/{filename}`) rather than human-readable activity names to ensure immutability when activities are renamed or edited.
- **Implementation Detail Abstraction**: Storage bucket key structures remain internal implementation details; human-readable activity names and metadata are resolved dynamically from database relations.
- **Migration Isolation**: Storage infrastructure DDL scripts were decoupled from feature migration scripts (`003_budget_schema_alignment.sql`) into a dedicated migration (`004_photo_storage_policies.sql`) to preserve idempotency and migration traceability.
