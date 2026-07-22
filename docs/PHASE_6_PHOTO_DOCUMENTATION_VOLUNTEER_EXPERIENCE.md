# Phase 6 — Photo Documentation & Volunteer Experience

> Historical implementation record for Phase 6.

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
- `PhotosTab.tsx` — Faculty photo review, filter, report toggle, and management tab.

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

## Database Changes

- Uses existing `public.photos` table defined in `001_complete_schema.sql`.
- Interacts with `camp-photos` Supabase Storage bucket.

---

## Build Verification

- `npx tsc --noEmit`: Verified 0 errors.
- `npm run build`: Production bundle generated successfully (`dist/assets/index-*.js`, `dist/assets/index-*.css`).

---

## Remaining Work

- Execute storage bucket SQL policy execution on live Supabase instance if not already provisioned in cloud dashboard (`INSERT INTO storage.buckets...`).

---

## Deliverables

- `src/features/volunteer/index.ts`
- `src/features/volunteer/components/VolunteerCapturePage.tsx`
- `src/features/volunteer/components/MySubmissionsPage.tsx`
- `src/features/volunteer/components/ActivitySelector.tsx`
- `src/features/volunteer/components/PhotoCounter.tsx`
- `src/features/volunteer/components/PhotoThumbnail.tsx`
- `src/features/volunteer/components/PhotosTab.tsx`
- `src/features/volunteer/hooks/useMyCampAssignment.ts`
- `src/features/volunteer/hooks/useActivityPhotos.ts`
- `src/features/volunteer/hooks/useMyPhotos.ts`
- `src/features/volunteer/hooks/useCampPhotos.ts`
- `src/features/volunteer/services/photoService.ts`
- `src/features/volunteer/services/volunteerService.ts`
- `src/features/camps/components/CampDetailPage.tsx` (updated)
- `src/app/routes.tsx` (updated)
