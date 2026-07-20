import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useMyCampAssignment } from '@/features/volunteer/hooks/useMyCampAssignment';
import { useMyPhotos } from '@/features/volunteer/hooks/useMyPhotos';
import { ActivitySelector } from '@/features/volunteer/components/ActivitySelector';
import { PhotoCounter } from '@/features/volunteer/components/PhotoCounter';
import { Card, Spinner } from '@/components/ui';
import { Camera, Images, MapPin, Calendar } from 'lucide-react';
import { ROUTES, APP_CONFIG } from '@/constants';
import { useState } from 'react';
import type { Activity } from '@/types';

/**
 * Volunteer home page — live camp assignment, activity selector,
 * photo counter, and quick-action shortcuts.
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

  /* ─── No active camp ─── */
  if (!camp) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
        <div className="w-16 h-16 rounded-2xl bg-surface-100 flex items-center justify-center">
          <MapPin className="w-8 h-8 text-surface-400" />
        </div>
        <p className="text-base font-semibold text-surface-800">No active camp</p>
        <p className="text-sm text-surface-500">
          You are not currently assigned to an active camp.
          <br />
          Contact your faculty coordinator.
        </p>
      </div>
    );
  }

  const activityPhotoCount = photos.filter(
    (p) => p.activity_id === selectedActivity?.id
  ).length;
  const maxPhotos = camp.report_settings?.max_photos_per_activity ?? APP_CONFIG.DEFAULT_MAX_PHOTOS_PER_ACTIVITY;
  const atLimit = activityPhotoCount >= maxPhotos;

  return (
    <div className="space-y-5">
      {/* ─── Camp Banner ─── */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-2xl p-5 text-white shadow-lg shadow-primary-600/20">
        <p className="text-xs font-medium text-primary-200 uppercase tracking-wider">Active Camp</p>
        <h2 className="text-lg font-bold mt-0.5 leading-snug">{camp.camp_name}</h2>
        <div className="flex items-center gap-1.5 mt-2 text-primary-200 text-xs">
          <MapPin className="w-3 h-3" />
          <span>{camp.village_name}, {camp.district}</span>
        </div>
        <div className="flex items-center gap-1.5 mt-1 text-primary-200 text-xs">
          <Calendar className="w-3 h-3" />
          <span>{new Date(camp.camp_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
        </div>
      </div>

      {/* ─── Activity Selector + Counter ─── */}
      <Card>
        <ActivitySelector
          campId={camp.id}
          selectedActivityId={selectedActivity?.id ?? null}
          onSelect={setSelectedActivity}
        />
        {selectedActivity && (
          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs text-surface-500">Photos for this activity</span>
            <PhotoCounter count={activityPhotoCount} max={maxPhotos} />
          </div>
        )}
      </Card>

      {/* ─── Quick Actions ─── */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => navigate(ROUTES.VOLUNTEER_CAPTURE)}
          disabled={!selectedActivity || atLimit}
          className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-primary-600 text-white font-medium text-sm shadow-md shadow-primary-600/20 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-transform"
        >
          <Camera className="w-6 h-6" />
          <span>{atLimit ? 'Limit reached' : 'Capture Photo'}</span>
        </button>
        <button
          onClick={() => navigate(ROUTES.VOLUNTEER_SUBMISSIONS)}
          className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-surface-100 text-surface-700 font-medium text-sm active:scale-95 transition-transform"
        >
          <Images className="w-6 h-6" />
          <span>My Work</span>
        </button>
      </div>

      {/* ─── Total count ─── */}
      {photos.length > 0 && (
        <p className="text-xs text-center text-surface-400">
          {photos.length} photo{photos.length !== 1 ? 's' : ''} submitted this camp
        </p>
      )}
    </div>
  );
}
