import { useRef, useState, useEffect, type ChangeEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Camera, ArrowLeft, MapPin, AlertCircle, CheckCircle, Compass } from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useMyProjectAssignment } from '@/features/volunteer/hooks/useMyProjectAssignment';
import { useActivityPhotos } from '@/features/volunteer/hooks/useActivityPhotos';
import { uploadPhoto } from '@/features/volunteer/services/photoService';
import { ActivitySelector } from '@/features/volunteer/components/ActivitySelector';
import { PhotoCounter } from '@/features/volunteer/components/PhotoCounter';
import { PhotoThumbnail } from '@/features/volunteer/components/PhotoThumbnail';
import { PhotoLightboxModal, type PhotoPreviewData } from '@/features/volunteer/components/PhotoLightboxModal';
import { Spinner } from '@/components/ui';
import { ROUTES, APP_CONFIG } from '@/constants';
import type { Activity } from '@/types';
import { getProjectLifecycleState } from '@/utils/projectLifecycle';

const compressImage = (file: File): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Canvas toBlob returned null'));
            }
          },
          'image/jpeg',
          0.6
        );
      };
      img.onerror = () => reject(new Error('Failed to load image for compression'));
      img.src = event.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file for compression'));
    reader.readAsDataURL(file);
  });
};

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

  const {
    coords: capturedCoords,
    isLoading: gpsLoading,
    captureLocation
  } = useGeolocation();

  const lifecycle = project ? getProjectLifecycleState(project) : null;
  const isCompleted = lifecycle?.isCompleted ?? false;

  useEffect(() => {
    if (isCompleted) {
      navigate(ROUTES.VOLUNTEER_HOME);
    }
  }, [isCompleted, navigate]);

  useEffect(() => {
    if (selectedActivity && shouldAutoTrigger && fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, [selectedActivity, shouldAutoTrigger]);

  const maxPhotos =
    project?.report_settings?.max_photos_per_activity ?? APP_CONFIG.DEFAULT_MAX_PHOTOS_PER_ACTIVITY;
  const count = photos.length;
  const atLimit = count >= maxPhotos;
  const canCapture = Boolean(selectedActivity && !atLimit && !isUploading);

  const handleCaptureClick = async () => {
    if (!canCapture) return;
    captureLocation(false);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedActivity || !project || !userId) return;

    setIsUploading(true);
    setUploadError(null);

    let activeGps = capturedCoords;
    if (!activeGps) {
      activeGps = await captureLocation(false);
    }

    try {
      const compressedBlob = await compressImage(file);
      const compressedFile = new File([compressedBlob], file.name.replace(/\.[^/.]+$/, '.jpg'), {
        type: 'image/jpeg',
      });

      await uploadPhoto({
        file: compressedFile,
        projectId: project.id,
        activityId: selectedActivity.id,
        uploadedBy: userId,
        latitude: activeGps?.latitude,
        longitude: activeGps?.longitude,
      });

      await reloadPhotos();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Failed to upload photo. Please try again.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (projectLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isCompleted) return null;

  if (projectError || !project) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center max-w-sm mx-auto space-y-3">
        <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
          <MapPin size={24} />
        </div>
        <h2 className="text-base font-bold text-slate-900">No Active Assignment</h2>
        <p className="text-xs text-slate-500">
          {projectError ?? 'You are not assigned to an active project.'}
        </p>
        <button
          onClick={() => navigate(ROUTES.VOLUNTEER_HOME)}
          className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs shadow-xs cursor-pointer mt-2"
        >
          Back to Home
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-lg mx-auto animate-fade-in pb-12">
      {/* ─── Back Navigation ─── */}
      <button
        onClick={() => navigate(ROUTES.VOLUNTEER_HOME)}
        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors cursor-pointer"
      >
        <ArrowLeft size={14} />
        <span>Back to Portal Home</span>
      </button>

      {/* ─── Header ─── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">Capture Documentation</h1>
          <p className="text-xs text-slate-500 mt-0.5">{project.camp_name}</p>
        </div>
        {selectedActivity && (
          <PhotoCounter count={count} max={maxPhotos} />
        )}
      </div>

      {(uploadError || photosError) && (
        <div className="flex items-center gap-2 p-3.5 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-xs font-medium">
          <AlertCircle size={16} className="shrink-0" />
          <span>{uploadError ?? photosError}</span>
        </div>
      )}

      {/* ─── Activity Selector ─── */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-4 space-y-3">
        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
          Select Target Activity
        </label>
        <ActivitySelector
          project={project}
          campId={project.id}
          selectedActivityId={selectedActivity?.id ?? null}
          onSelect={setSelectedActivity}
        />
      </div>

      {/* ─── GPS Status Banner ─── */}
      {capturedCoords ? (
        <div className="flex items-center gap-2 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-semibold">
          <CheckCircle size={15} className="text-emerald-600 shrink-0" />
          <span>
            GPS Geotag Ready: {capturedCoords.latitude.toFixed(4)}, {capturedCoords.longitude.toFixed(4)}
          </span>
        </div>
      ) : gpsLoading ? (
        <div className="flex items-center gap-2 px-4 py-3 bg-indigo-50 border border-indigo-200 rounded-2xl text-indigo-800 text-xs font-semibold animate-pulse">
          <Compass size={15} className="text-indigo-600 shrink-0 animate-spin" />
          <span>Acquiring GPS coordinates…</span>
        </div>
      ) : (
        <div className="flex items-center gap-2 px-4 py-3 bg-slate-100 border border-slate-200 rounded-2xl text-slate-600 text-xs font-semibold">
          <Compass size={15} className="text-slate-400 shrink-0" />
          <span>GPS tag will be attached on shutter press</span>
        </div>
      )}

      {/* ─── Camera Trigger ─── */}
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
        className="w-full flex flex-col items-center justify-center gap-2.5 py-6 px-4 rounded-3xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white font-bold text-sm shadow-md shadow-indigo-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
      >
        {isUploading ? (
          <>
            <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            <span>Uploading Documentation Photo…</span>
          </>
        ) : (
          <>
            <Camera size={26} />
            <span>
              {!selectedActivity
                ? 'Select an Activity Above'
                : atLimit
                ? 'Photo Limit Reached for Activity'
                : 'Open Camera'}
            </span>
          </>
        )}
      </button>

      {/* ─── Thumbnails for Selected Activity ─── */}
      {selectedActivity && (
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              {selectedActivity.activity_name} Photos
            </h2>
            <span className="text-[11px] font-semibold text-slate-400">
              {photos.length} uploaded
            </span>
          </div>

          {photosLoading ? (
            <div className="flex justify-center py-6">
              <Spinner size="sm" />
            </div>
          ) : photos.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-6 italic">
              No photos uploaded yet for this activity.
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-2.5">
              {photos.map((photo) => (
                <div key={photo.id} className="aspect-square rounded-2xl overflow-hidden bg-slate-100 border border-slate-200">
                  <PhotoThumbnail
                    path={photo.file_url}
                    onClick={() =>
                      setActivePreviewPhoto({
                        ...photo,
                        activity: { activity_name: selectedActivity.activity_name },
                      })
                    }
                  />
                </div>
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
