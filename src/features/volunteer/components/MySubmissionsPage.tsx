import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Trash2, MapPin, AlertCircle, Images } from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useMyCampAssignment } from '@/features/volunteer/hooks/useMyCampAssignment';
import { useMyPhotos } from '@/features/volunteer/hooks/useMyPhotos';
import { deletePhoto, type PhotoWithActivityName } from '@/features/volunteer/services/photoService';
import { PhotoThumbnail } from '@/features/volunteer/components/PhotoThumbnail';
import { PhotoLightboxModal, type PhotoPreviewData } from '@/features/volunteer/components/PhotoLightboxModal';
import { Card, Spinner, Button } from '@/components/ui';
import { ROUTES } from '@/constants';

export function MySubmissionsPage() {
  const { personId, userId } = useAuth();
  const navigate = useNavigate();

  const { camp, isLoading: campLoading, error: campError } = useMyCampAssignment(personId);
  const { photos, isLoading: photosLoading, error: photosError, reload } = useMyPhotos(
    camp?.id ?? null,
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

  if (campLoading || photosLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  if (campError || !camp) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
        <div className="w-16 h-16 rounded-2xl bg-surface-100 flex items-center justify-center">
          <MapPin className="w-8 h-8 text-surface-400" />
        </div>
        <p className="text-base font-semibold text-surface-800">No active camp</p>
        <p className="text-sm text-surface-500">
          {campError ?? 'You are not assigned to an active camp.'}
        </p>
        <Button variant="secondary" size="sm" onClick={() => navigate(ROUTES.VOLUNTEER_HOME)}>
          Back to Home
        </Button>
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
    <div className="space-y-5 max-w-lg mx-auto">
      {/* ─── Header ─── */}
      <button
        onClick={() => navigate(ROUTES.VOLUNTEER_HOME)}
        className="flex items-center gap-1 text-sm text-surface-500 hover:text-surface-700 transition-colors"
      >
        <ChevronLeft size={16} />
        Back to Home
      </button>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-surface-900">Personal Gallery</h1>
          <p className="text-xs text-surface-500 mt-0.5">{camp.camp_name}</p>
        </div>
        <div className="px-3 py-1 rounded-full bg-primary-50 text-primary-700 text-xs font-semibold">
          {photos.length} Photo{photos.length !== 1 ? 's' : ''} Submitted
        </div>
      </div>

      {(photosError || deleteError) && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          <AlertCircle size={16} className="flex-shrink-0" />
          {photosError ?? deleteError}
        </div>
      )}

      {photos.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
            <div className="w-12 h-12 rounded-xl bg-surface-100 flex items-center justify-center">
              <Images className="w-6 h-6 text-surface-400" />
            </div>
            <p className="text-sm font-semibold text-surface-800">No submissions yet</p>
            <p className="text-xs text-surface-500">
              Photos you capture during activities will appear here grouped by activity.
            </p>
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate(ROUTES.VOLUNTEER_CAPTURE)}
              className="mt-2"
            >
              Capture Photo
            </Button>
          </div>
        </Card>
      ) : (
        /* Render Photos Grouped by Activity per Specification */
        <div className="space-y-6">
          {activityGroups.map(([activityName, groupPhotos]) => (
            <div key={activityName} className="space-y-2.5">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-sm font-bold text-surface-800 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary-600"></span>
                  {activityName}
                </h3>
                <span className="text-xs font-medium text-surface-400">
                  {groupPhotos.length} photo{groupPhotos.length !== 1 ? 's' : ''}
                </span>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                {groupPhotos.map((photo) => (
                  <div
                    key={photo.id}
                    className="group relative overflow-hidden bg-white rounded-xl border border-surface-200 shadow-sm p-1 space-y-1"
                  >
                    <div className="relative aspect-square w-full rounded-lg overflow-hidden bg-surface-100">
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
                      {/* Delete Button */}
                      <button
                        onClick={() => setPhotoToDelete(photo)}
                        title="Delete photo"
                        className="absolute bottom-1 right-1 p-1.5 rounded-lg bg-slate-900/70 text-white/90 hover:text-red-400 hover:bg-slate-900 backdrop-blur-md opacity-90 transition-all cursor-pointer"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                    <p className="text-[10px] text-surface-400 px-1 text-center font-medium truncate">
                      {new Date(photo.captured_at).toLocaleTimeString('en-IN', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
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
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)' }}
          onClick={(e) => e.target === e.currentTarget && !isDeleting && setPhotoToDelete(null)}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5 space-y-3">
            <h3 className="text-base font-semibold text-surface-900">Delete Photo</h3>
            <p className="text-xs text-surface-600 leading-relaxed">
              Are you sure you want to delete this photo? You can upload a replacement photo for this activity if under the limit.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" disabled={isDeleting} onClick={() => setPhotoToDelete(null)}>
                Cancel
              </Button>
              <Button variant="danger" size="sm" isLoading={isDeleting} onClick={handleDelete}>
                Delete
              </Button>
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
