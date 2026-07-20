import { useRef, useState, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, ChevronLeft, MapPin, AlertCircle } from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useMyCampAssignment } from '@/features/volunteer/hooks/useMyCampAssignment';
import { useActivityPhotos } from '@/features/volunteer/hooks/useActivityPhotos';
import { uploadPhoto } from '@/features/volunteer/services/photoService';
import { ActivitySelector } from '@/features/volunteer/components/ActivitySelector';
import { PhotoCounter } from '@/features/volunteer/components/PhotoCounter';
import { PhotoThumbnail } from '@/features/volunteer/components/PhotoThumbnail';
import { Card, Spinner, Button } from '@/components/ui';
import { ROUTES, APP_CONFIG } from '@/constants';
import type { Activity } from '@/types';

function getCurrentPosition(): Promise<{ latitude: number; longitude: number } | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      () => resolve(null),
      { timeout: 5000, maximumAge: 60000 }
    );
  });
}

/**
 * Volunteer photo capture flow — select an activity, then capture/upload
 * a photo for it. Enforces the camp's per-activity photo limit client-side
 * (the same limit shown by PhotoCounter on the home page).
 */
export function VolunteerCapturePage() {
  const { personId, userId } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { camp, isLoading: campLoading, error: campError } = useMyCampAssignment(personId);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);

  const {
    photos,
    isLoading: photosLoading,
    error: photosError,
    reload: reloadPhotos,
  } = useActivityPhotos(selectedActivity?.id ?? null, userId);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const maxPhotos =
    camp?.report_settings?.max_photos_per_activity ?? APP_CONFIG.DEFAULT_MAX_PHOTOS_PER_ACTIVITY;
  const atLimit = photos.length >= maxPhotos;
  const canCapture = !!selectedActivity && !!camp && !!userId && !atLimit && !isUploading;

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !camp || !selectedActivity || !userId) return;

    if (file.size > APP_CONFIG.MAX_PHOTO_SIZE_MB * 1024 * 1024) {
      setUploadError(`Photo must be smaller than ${APP_CONFIG.MAX_PHOTO_SIZE_MB}MB`);
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    try {
      const position = await getCurrentPosition();
      await uploadPhoto({
        campId: camp.id,
        activityId: selectedActivity.id,
        uploadedBy: userId,
        file,
        latitude: position?.latitude ?? null,
        longitude: position?.longitude ?? null,
      });
      reloadPhotos();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  /* ─── Loading ─── */
  if (campLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  /* ─── Error / no camp ─── */
  if (campError || !camp) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
        <div className="w-16 h-16 rounded-2xl bg-surface-100 flex items-center justify-center">
          <MapPin className="w-8 h-8 text-surface-400" />
        </div>
        <p className="text-base font-semibold text-surface-800">No active camp</p>
        <p className="text-sm text-surface-500">
          {campError ?? 'You are not currently assigned to an active camp.'}
        </p>
        <Button variant="secondary" size="sm" onClick={() => navigate(ROUTES.VOLUNTEER_HOME)}>
          Back to Home
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* ─── Header ─── */}
      <button
        onClick={() => navigate(ROUTES.VOLUNTEER_HOME)}
        className="flex items-center gap-1 text-sm text-surface-500 hover:text-surface-700 transition-colors"
      >
        <ChevronLeft size={16} />
        Back
      </button>

      <div>
        <h1 className="text-lg font-bold text-surface-900">Capture Photo</h1>
        <p className="text-sm text-surface-500 mt-0.5">{camp.camp_name}</p>
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
            <PhotoCounter count={photos.length} max={maxPhotos} />
          </div>
        )}
      </Card>

      {/* ─── Errors ─── */}
      {(uploadError || photosError) && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          <AlertCircle size={16} className="flex-shrink-0" />
          {uploadError ?? photosError}
        </div>
      )}

      {/* ─── Capture Button ─── */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={!canCapture}
        className="w-full flex flex-col items-center gap-2 p-6 rounded-2xl bg-primary-600 text-white font-medium text-sm shadow-md shadow-primary-600/20 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-transform"
      >
        {isUploading ? (
          <>
            <Spinner size="sm" />
            <span>Uploading…</span>
          </>
        ) : (
          <>
            <Camera className="w-7 h-7" />
            <span>
              {!selectedActivity
                ? 'Select an activity first'
                : atLimit
                  ? 'Limit reached for this activity'
                  : 'Take Photo'}
            </span>
          </>
        )}
      </button>

      {/* ─── This Activity's Photos ─── */}
      {selectedActivity && (
        <div>
          <h2 className="text-sm font-semibold text-surface-700 mb-2">
            Captured for this activity
          </h2>
          {photosLoading ? (
            <div className="flex justify-center py-8">
              <Spinner size="sm" />
            </div>
          ) : photos.length === 0 ? (
            <p className="text-sm text-surface-400 text-center py-6">
              No photos captured for this activity yet.
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {photos.map((photo) => (
                <PhotoThumbnail key={photo.id} path={photo.file_url} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
