import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useMyCampAssignment } from '@/features/volunteer/hooks/useMyCampAssignment';
import { useMyPhotos } from '@/features/volunteer/hooks/useMyPhotos';
import { ActivitySelector } from '@/features/volunteer/components/ActivitySelector';
import { PhotoCounter } from '@/features/volunteer/components/PhotoCounter';
import { Card, Spinner, Button } from '@/components/ui';
import { Camera, Images, MapPin, Calendar, ClipboardList, CheckCircle } from 'lucide-react';
import { ROUTES, APP_CONFIG, CAMP_STATUS } from '@/constants';
import type { Activity } from '@/types';

/**
 * Volunteer Workspace Home Page
 * Implements the Volunteer Home workflow for Upcoming, Active, and Finished camp states
 * per the Mobile UI Workflow Specification.
 */
export function VolunteerHomePage() {
  const { personId, userId } = useAuth();
  const navigate = useNavigate();

  const { camp, isLoading: campLoading, error: campError } = useMyCampAssignment(personId);
  const { photos } = useMyPhotos(camp?.id ?? null, userId);

  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);

  /* ─── Loading ─── */
  if (campLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  /* ─── Error ─── */
  if (campError) {
    return (
      <Card>
        <p className="text-sm text-red-600 text-center py-6">{campError}</p>
      </Card>
    );
  }

  /* ─── No assigned camp ─── */
  if (!camp) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
        <div className="w-16 h-16 rounded-2xl bg-surface-100 flex items-center justify-center">
          <MapPin className="w-8 h-8 text-surface-400" />
        </div>
        <p className="text-base font-semibold text-surface-800">No active camp assigned</p>
        <p className="text-sm text-surface-500">
          You are not currently assigned to an active camp.
          <br />
          Contact your faculty coordinator.
        </p>
      </div>
    );
  }

  const isUpcoming = camp.status === CAMP_STATUS.DRAFT;
  const isFinished = camp.status === CAMP_STATUS.COMPLETED || camp.status === CAMP_STATUS.ARCHIVED;
  const isActive = camp.status === CAMP_STATUS.ACTIVE;

  /* ─── 1. UPCOMING CAMP STATE ─── */
  if (isUpcoming) {
    return (
      <div className="space-y-6 max-w-md mx-auto py-6">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-6 text-white shadow-lg shadow-blue-600/20 text-center space-y-3">
          <span className="px-3 py-1 rounded-full bg-white/20 text-xs font-semibold uppercase tracking-wider">
            Upcoming Camp
          </span>
          <h2 className="text-xl font-bold">{camp.camp_name}</h2>
          <div className="flex items-center justify-center gap-2 text-blue-100 text-sm">
            <Calendar size={16} />
            <span>Scheduled on {new Date(camp.camp_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
          </div>
          <div className="flex items-center justify-center gap-1.5 text-blue-200 text-xs">
            <MapPin size={14} />
            <span>{camp.village_name}, {camp.district}</span>
          </div>
        </div>

        <Card>
          <div className="text-center py-6 space-y-2">
            <p className="text-sm font-semibold text-surface-800">Documentation Unlocks at Camp Start</p>
            <p className="text-xs text-surface-500">
              Camera photo capture and survey forms will automatically activate once faculty starts the camp.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  /* ─── 2. FINISHED CAMP STATE ─── */
  if (isFinished) {
    return (
      <div className="space-y-6 max-w-md mx-auto py-6">
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-2xl p-6 text-white shadow-lg shadow-emerald-600/20 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-white/20 mx-auto flex items-center justify-center">
            <CheckCircle className="w-6 h-6 text-white" />
          </div>
          <span className="px-3 py-1 rounded-full bg-white/20 text-xs font-semibold uppercase tracking-wider">
            Camp Concluded
          </span>
          <h2 className="text-xl font-bold">{camp.camp_name}</h2>
          <p className="text-xs text-emerald-100">
            Thank you for your active participation in documenting this camp.
          </p>
        </div>

        <Card>
          <div className="text-center py-4 space-y-3">
            <p className="text-sm font-semibold text-surface-800">Participation Summary</p>
            <p className="text-xs text-surface-500">
              You submitted <span className="font-bold text-emerald-600">{photos.length}</span> documentation photos for this camp.
            </p>
            <Button size="sm" variant="outline" onClick={() => navigate(ROUTES.VOLUNTEER_SUBMISSIONS)}>
              View Submission Gallery
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  /* ─── 3. ACTIVE CAMP STATE (Primary Working Screen) ─── */
  const activityPhotoCount = photos.filter(
    (p) => p.activity_id === selectedActivity?.id
  ).length;
  const maxPhotos = camp.report_settings?.max_photos_per_activity ?? APP_CONFIG.DEFAULT_MAX_PHOTOS_PER_ACTIVITY;
  const atLimit = activityPhotoCount >= maxPhotos;

  return (
    <div className="space-y-4 max-w-md mx-auto">
      {/* ── Top Section (~10%): Active Camp Header ── */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-800 rounded-2xl p-4 text-white shadow-md shadow-primary-600/20 flex items-center justify-between">
        <div>
          <span className="text-[10px] font-medium uppercase tracking-wider text-primary-200">Active Camp</span>
          <h2 className="text-base font-bold leading-tight">{camp.camp_name}</h2>
          <p className="text-xs text-primary-200 mt-0.5">{camp.village_name}, {camp.district}</p>
        </div>
      </div>

      {/* ── Second Section (~20%): Activity Dropdown, Gallery Button & Photo Counter ── */}
      <Card className="p-3 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1">
            <ActivitySelector
              campId={camp.id}
              selectedActivityId={selectedActivity?.id ?? null}
              onSelect={setSelectedActivity}
            />
          </div>
          <button
            onClick={() => navigate(ROUTES.VOLUNTEER_SUBMISSIONS)}
            className="flex items-center gap-1 px-3 py-2 rounded-xl bg-surface-100 text-surface-700 font-medium text-xs hover:bg-surface-200 active:scale-95 transition-all flex-shrink-0"
            title="Open Gallery"
          >
            <Images size={15} />
            <span>Gallery</span>
          </button>
        </div>

        {selectedActivity ? (
          <div className="flex items-center justify-between pt-1 border-t border-surface-100">
            <span className="text-xs text-surface-500 font-medium">Photos Used for {selectedActivity.activity_name}</span>
            <PhotoCounter count={activityPhotoCount} max={maxPhotos} />
          </div>
        ) : (
          <p className="text-xs text-surface-400 text-center italic pt-1">Select an activity to begin photo capture</p>
        )}
      </Card>

      {/* ── Main Area (~70%): Equal Split Large Action Buttons ── */}
      <div className="grid grid-rows-2 gap-3 min-h-[320px]">
        {/* Upper Half: CAMERA */}
        <button
          onClick={() => navigate(ROUTES.VOLUNTEER_CAPTURE)}
          disabled={!selectedActivity || atLimit || !isActive}
          className="w-full h-full flex flex-col items-center justify-center gap-3 p-6 rounded-2xl bg-gradient-to-br from-primary-600 to-primary-700 text-white font-bold text-lg shadow-lg shadow-primary-600/30 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] transition-all"
        >
          <Camera className="w-10 h-10" />
          <span>
            {!selectedActivity
              ? 'CAMERA (Select Activity First)'
              : atLimit
                ? `Limit Reached (${maxPhotos}/${maxPhotos})`
                : 'CAMERA'}
          </span>
        </button>

        {/* Lower Half: SURVEY FORM */}
        <button
          onClick={() => alert('Survey forms module opens beneficiary survey collection.')}
          disabled={!isActive}
          className="w-full h-full flex flex-col items-center justify-center gap-3 p-6 rounded-2xl bg-gradient-to-br from-accent-600 to-accent-700 text-white font-bold text-lg shadow-lg shadow-accent-600/30 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] transition-all"
        >
          <ClipboardList className="w-10 h-10" />
          <span>SURVEY FORM</span>
        </button>
      </div>
    </div>
  );
}
