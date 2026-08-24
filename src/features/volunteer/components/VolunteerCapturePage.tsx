import { useRef, useState, useEffect, type ChangeEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Camera, ChevronLeft, MapPin, AlertCircle, CheckCircle, Compass } from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useMyProjectAssignment } from '@/features/volunteer/hooks/useMyProjectAssignment';
import { useActivityPhotos } from '@/features/volunteer/hooks/useActivityPhotos';
import { uploadPhoto } from '@/features/volunteer/services/photoService';
import { ActivitySelector } from '@/features/volunteer/components/ActivitySelector';
import { PhotoCounter } from '@/features/volunteer/components/PhotoCounter';
import { PhotoThumbnail } from '@/features/volunteer/components/PhotoThumbnail';
import { PhotoLightboxModal, type PhotoPreviewData } from '@/features/volunteer/components/PhotoLightboxModal';
import { Card, Spinner, Button } from '@/components/ui';
import { ROUTES, APP_CONFIG } from '@/constants';
import type { Activity } from '@/types';
import { getProjectLifecycleState } from '@/utils/projectLifecycle';

/**
 * Volunteer photo capture flow — select an activity, then capture/upload
 * a photo for it. Auto-triggers camera/file-picker if activity was selected prior to navigation.
 */
export function VolunteerCapturePage() {
  const { personId, userId } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const locState = location.state as { selectedActivity?: Activity; autoTrigger?: boolean } | null;
  const initialActivity = locState?.selectedActivity ?? null;
  const shouldAutoTrigger = Boolean(locState?.autoTrigger || locState?.selectedActivity);

  const { project, isLoading: projectLoading, error: projectError } = useMyProjectAssignment(personId);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(initialActivity);
  const [activePreviewPhoto, setActivePreviewPhoto] = useState<PhotoPreviewData | null>(null);

  const {
    photos,
    isLoading: photosLoading,
    error: photosError,
    reload: reloadPhotos,
  } = useActivityPhotos(selectedActivity?.id ?? null, userId);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Consume unified useGeolocation hook
  const {
    coords: capturedCoords,
    isLoading: gpsLoading,
    error: gpsError,
    permissionState,
    captureLocation
  } = useGeolocation();

  const handleCaptureClick = async () => {
    setUploadError(null);
    
    // Attempt location acquisition but do not block photo capture if it fails
    let position = capturedCoords;
    if (!position && permissionState !== 'denied') {
      position = await captureLocation(false);
    }

    fileInputRef.current?.click();
  };

  const maxPhotos =
    project?.report_settings?.max_photos_per_activity ?? APP_CONFIG.DEFAULT_MAX_PHOTOS_PER_ACTIVITY;
  const atLimit = photos.length >= maxPhotos;
  const canCapture = !!selectedActivity && !!project && !!userId && !atLimit && !isUploading;

  // Single-camera click optimization: immediately open picker if activity was pre-selected
  const autoTriggeredRef = useRef(false);
  useEffect(() => {
    if (shouldAutoTrigger && canCapture && !autoTriggeredRef.current) {
      if (permissionState === 'granted' && capturedCoords) {
        autoTriggeredRef.current = true;
        fileInputRef.current?.click();
      } else if (permissionState === 'prompt') {
        // Do not auto-trigger file picker if permission prompt is not yet granted
      }
    }
  }, [shouldAutoTrigger, canCapture, permissionState, capturedCoords]);

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !project || !selectedActivity || !userId) return;

    if (file.size > APP_CONFIG.MAX_PHOTO_SIZE_MB * 1024 * 1024) {
      setUploadError(`Photo must be smaller than ${APP_CONFIG.MAX_PHOTO_SIZE_MB}MB`);
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    try {
      const position = capturedCoords;

      await uploadPhoto({
        projectId: project.id,
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

  const lifecycle = project ? getProjectLifecycleState(project) : null;
  const isOperational = lifecycle ? (lifecycle.isSurveyActive || lifecycle.isCampActive) : false;

  useEffect(() => {
    if (project && !isOperational) {
      navigate(ROUTES.VOLUNTEER_HOME);
    }
  }, [project, isOperational, navigate]);

  /* ─── Loading ─── */
  if (projectLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  if (project && !isOperational) {
    return null;
  }

  /* ─── Error / no project ─── */
  if (projectError || !project) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
        <div className="w-16 h-16 rounded-2xl bg-surface-100 flex items-center justify-center">
          <MapPin className="w-8 h-8 text-surface-400" />
        </div>
        <p className="text-base font-semibold text-surface-800">No active project</p>
        <p className="text-sm text-surface-500">
          {projectError ?? 'You are not currently assigned to an active project.'}
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
        <p className="text-sm text-surface-500 mt-0.5">{project.camp_name}</p>
      </div>

      {/* ─── Activity Selector + Counter ─── */}
      <Card>
        <ActivitySelector
          project={project}
          campId={project.id}
          selectedActivityId={selectedActivity?.id ?? null}
          onSelect={setSelectedActivity}
          phase={getProjectLifecycleState(project).isSurveyActive ? 'survey' : 'camp'}
          disabled={getProjectLifecycleState(project).isSurveyActive}
        />
        {selectedActivity && (
          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs text-surface-500">Photos for this activity</span>
            <PhotoCounter count={photos.length} max={maxPhotos} />
          </div>
        )}
      </Card>

      {/* ─── Errors & Warnings ─── */}
      {(uploadError || photosError) && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          <AlertCircle size={16} className="flex-shrink-0" />
          {uploadError ?? photosError}
        </div>
      )}

      {/* ─── GPS Coordinates Metadata Status ─── */}
      {capturedCoords ? (
        <div className="flex items-center justify-between gap-2 px-4 py-3 bg-emerald-50 border border-emerald-250 rounded-xl text-emerald-800 text-xs">
          <span className="flex items-center gap-1.5 font-medium">
            <CheckCircle size={15} className="text-emerald-600 flex-shrink-0" />
            Location captured. Photo will include GPS.
          </span>
          <span className="font-mono text-[10px] bg-white border border-emerald-100 px-2 py-0.5 rounded text-emerald-900">
            {capturedCoords.latitude.toFixed(5)}, {capturedCoords.longitude.toFixed(5)}
          </span>
        </div>
      ) : permissionState === 'denied' || gpsError ? (
        <div className="flex flex-col gap-1.5 px-4 py-3 bg-amber-50 border border-amber-250 rounded-xl text-amber-800 text-xs">
          <div className="flex items-center gap-1.5 font-medium">
            <AlertCircle size={15} className="text-amber-600 flex-shrink-0" />
            Location unavailable — photo will be saved without GPS.
          </div>
          {permissionState === 'denied' && (
            <p className="text-[10px] text-amber-700">
              To attach coordinates, please enable location permission in Safari/browser settings.
            </p>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-1.5 px-4 py-3 bg-blue-50 border border-blue-250 rounded-xl text-blue-800 text-xs font-medium">
          <Compass size={15} className="text-blue-600 flex-shrink-0" />
          Location not yet captured — will request when taking photo.
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
        onClick={handleCaptureClick}
        disabled={!canCapture}
        className="w-full flex flex-col items-center gap-2 p-6 rounded-2xl bg-primary-600 text-white font-medium text-sm shadow-md shadow-primary-600/20 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-transform"
      >
        {isUploading ? (
          <>
            <Spinner size="sm" />
            <span>Uploading…</span>
          </>
        ) : gpsLoading ? (
          <>
            <Spinner size="sm" />
            <span>Acquiring GPS location…</span>
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

      {/* ─── This Activity's Photos (Responsive Thumbnail Gallery) ─── */}
      {selectedActivity && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-surface-800">
              Captured for this activity
            </h2>
            <span className="text-xs text-surface-400 font-medium">
              Click thumbnail for full preview
            </span>
          </div>

          {photosLoading ? (
            <div className="flex justify-center py-8">
              <Spinner size="sm" />
            </div>
          ) : photos.length === 0 ? (
            <p className="text-xs text-surface-400 text-center py-6 bg-surface-50 rounded-xl border border-dashed border-surface-200">
              No photos captured for this activity yet.
            </p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
              {photos.map((photo) => (
                <PhotoThumbnail
                  key={photo.id}
                  path={photo.file_url}
                  onClick={() =>
                    setActivePreviewPhoto({
                      ...photo,
                      activity: { activity_name: selectedActivity.activity_name },
                    })
                  }
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Lightbox Modal */}
      <PhotoLightboxModal
        photo={activePreviewPhoto}
        isOpen={Boolean(activePreviewPhoto)}
        onClose={() => setActivePreviewPhoto(null)}
      />
    </div>
  );
}
