import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2, MapPin, AlertCircle, Images, ArrowLeft, Plus } from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useMyProjectAssignment } from '@/features/volunteer/hooks/useMyProjectAssignment';
import { useMyPhotos } from '@/features/volunteer/hooks/useMyPhotos';
import { deletePhoto, type PhotoWithActivityName } from '@/features/volunteer/services/photoService';
import { PhotoThumbnail } from '@/features/volunteer/components/PhotoThumbnail';
import { PhotoLightboxModal, type PhotoPreviewData } from '@/features/volunteer/components/PhotoLightboxModal';
import { Spinner } from '@/components/ui';
import { ROUTES } from '@/constants';
import { getProjectLifecycleState, deriveProjectStatus } from '@/utils/projectLifecycle';

export function MySubmissionsPage() {
  const { personId, userId } = useAuth();
  const navigate = useNavigate();

  const { project, isLoading: projectLoading, error: projectError } = useMyProjectAssignment(personId);
  const { photos, isLoading: photosLoading, error: photosError, reload } = useMyPhotos(
    project?.id ?? null,
    userId
  );

  const [photoToDelete, setPhotoToDelete] = useState<PhotoWithActivityName | null>(null);
  const [activePreviewPhoto, setActivePreviewPhoto] = useState<PhotoPreviewData | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!photoToDelete) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deletePhoto(photoToDelete.id, photoToDelete.file_url);
      setPhotoToDelete(null);
      await reload();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete photo');
    } finally {
      setIsDeleting(false);
    }
  };

  const lifecycle = project ? getProjectLifecycleState(project) : null;
  const derivedStatus = project ? deriveProjectStatus(project) : null;
  const isCompleted = !!(lifecycle?.isCompleted || derivedStatus === 'archived' || derivedStatus === 'completed');

  useEffect(() => {
    if (isCompleted) {
      navigate(ROUTES.VOLUNTEER_HOME);
    }
  }, [isCompleted, navigate]);

  if (projectLoading || photosLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isCompleted) {
    return null;
  }

  if (projectError || !project) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 gap-3 text-center max-w-md mx-auto">
        <div className="w-16 h-16 rounded-3xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
          <MapPin className="w-7 h-7 text-indigo-600" />
        </div>
        <h2 className="text-base font-bold text-slate-900">No Active Project</h2>
        <p className="text-xs text-slate-500">
          {projectError ?? 'You are not assigned to an active project.'}
        </p>
        <button
          onClick={() => navigate(ROUTES.VOLUNTEER_HOME)}
          className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold shadow-xs transition-all cursor-pointer mt-2"
        >
          Back to Home
        </button>
      </div>
    );
  }

  /* Group photos by activity name */
  const groupedPhotos = photos.reduce<Record<string, PhotoWithActivityName[]>>((acc, photo) => {
    const activityName = photo.activity?.activity_name || 'General Activity';
    if (!acc[activityName]) {
      acc[activityName] = [];
    }
    acc[activityName].push(photo);
    return acc;
  }, {});

  const activityGroups = Object.entries(groupedPhotos);

  return (
    <div className="space-y-5 max-w-lg mx-auto pb-10 animate-fade-in">
      {/* ─── Back to Volunteer Home ─── */}
      <button
        onClick={() => navigate(ROUTES.VOLUNTEER_HOME)}
        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors cursor-pointer"
      >
        <ArrowLeft size={14} />
        <span>Back to Volunteer Portal</span>
      </button>

      {/* ─── Page Title Header ─── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Your Submissions Gallery</h1>
          <p className="text-xs text-slate-500 mt-0.5">{project.camp_name}</p>
        </div>
        <span className="px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-bold">
          {photos.length} Photo{photos.length !== 1 ? 's' : ''}
        </span>
      </div>

      {(photosError || deleteError) && (
        <div className="flex items-center gap-2 p-3.5 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-xs font-medium">
          <AlertCircle size={16} className="shrink-0" />
          <span>{photosError ?? deleteError}</span>
        </div>
      )}

      {photos.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-10 text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
            <Images size={24} />
          </div>
          <h3 className="text-sm font-bold text-slate-900">No Photos Submitted Yet</h3>
          <p className="text-xs text-slate-500 max-w-xs mx-auto">
            Photos captured during camp activities will appear here grouped by activity category.
          </p>
          <button
            onClick={() => navigate(ROUTES.VOLUNTEER_CAPTURE)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer mt-2"
          >
            <Plus size={14} />
            <span>Open Camera</span>
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {activityGroups.map(([activityName, groupPhotos]) => (
            <div key={activityName} className="bg-white rounded-3xl border border-slate-200 shadow-sm p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                  <h3 className="text-xs font-bold text-slate-900">{activityName}</h3>
                </div>
                <span className="text-[11px] font-semibold text-slate-400">
                  {groupPhotos.length} photo{groupPhotos.length !== 1 ? 's' : ''}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                {groupPhotos.map((photo) => (
                  <div
                    key={photo.id}
                    className="group relative aspect-square rounded-2xl overflow-hidden bg-slate-100 border border-slate-200"
                  >
                    <PhotoThumbnail
                      path={photo.file_url}
                      alt={activityName}
                      onClick={() =>
                        setActivePreviewPhoto({
                          ...photo,
                          activity: { activity_name: activityName },
                        })
                      }
                    />

                    <button
                      onClick={() => setPhotoToDelete(photo)}
                      title="Delete photo"
                      className="absolute bottom-1.5 right-1.5 p-1.5 rounded-xl bg-slate-950/70 text-white hover:text-red-400 hover:bg-slate-950 backdrop-blur-md transition-all cursor-pointer"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete confirmation modal */}
      {photoToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in"
          onClick={(e) => e.target === e.currentTarget && !isDeleting && setPhotoToDelete(null)}
        >
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 space-y-3 border border-slate-200">
            <h3 className="text-base font-bold text-slate-900">Delete Photo</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Remove this activity photo? If within the activity limit, you can capture a replacement photo.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                disabled={isDeleting}
                onClick={() => setPhotoToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                disabled={isDeleting}
                onClick={handleDelete}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
              >
                {isDeleting ? (
                  <>
                    <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    <span>Deleting…</span>
                  </>
                ) : (
                  <span>Delete</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Modal */}
      <PhotoLightboxModal
        photo={activePreviewPhoto}
        isOpen={Boolean(activePreviewPhoto)}
        onClose={() => setActivePreviewPhoto(null)}
        canDelete
        onDelete={(p) => setPhotoToDelete(p as PhotoWithActivityName)}
      />
    </div>
  );
}
