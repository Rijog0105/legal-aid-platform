import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Trash2, MapPin, User, Filter, AlertCircle } from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useMyProjectAssignment } from '@/features/volunteer/hooks/useMyProjectAssignment';
import { useProjectPhotos } from '@/features/volunteer/hooks/useProjectPhotos';
import { useActivities } from '@/features/activities/hooks/useActivities';
import { PhotoThumbnail } from '@/features/volunteer/components/PhotoThumbnail';
import { PhotoLightboxModal, type PhotoPreviewData } from '@/features/volunteer/components/PhotoLightboxModal';
import { Card, Spinner, EmptyState, Button } from '@/components/ui';
import { ROUTES } from '@/constants';
import type { PhotoWithDetails } from '@/features/volunteer/services/photoService';

/**
 * Team Lead Activity Photos Module
 * Displays all volunteer photos grouped by Activity → Volunteer.
 * Allows Team Leads to review submissions and delete blurry/duplicate photos
 * before Faculty review (without exposing Faculty report-selection controls).
 */
export function TeamLeadPhotosPage() {
  const { personId } = useAuth();
  const navigate = useNavigate();

  const { project, isLoading: projectLoading, error: projectError } = useMyProjectAssignment(personId);
  const { photos, isLoading: photosLoading, error: photosError, removePhoto } = useProjectPhotos(
    project?.id ?? null
  );
  const { activities } = useActivities(project?.id);

  const [selectedActivityId, setSelectedActivityId] = useState<string>('all');
  const [photoToDelete, setPhotoToDelete] = useState<PhotoWithDetails | null>(null);
  const [activePreviewPhoto, setActivePreviewPhoto] = useState<PhotoPreviewData | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const filteredPhotos = photos.filter((photo) => {
    if (selectedActivityId !== 'all' && photo.activity_id !== selectedActivityId) {
      return false;
    }
    return true;
  });

  const handleDeleteConfirm = async () => {
    if (!photoToDelete) return;
    setIsDeleting(true);
    setActionError(null);
    try {
      await removePhoto(photoToDelete.id, photoToDelete.file_url);
      setPhotoToDelete(null);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to delete photo');
    } finally {
      setIsDeleting(false);
    }
  };

  if (projectLoading || photosLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  if (projectError || !project) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
        <div className="w-16 h-16 rounded-2xl bg-surface-100 flex items-center justify-center">
          <MapPin className="w-8 h-8 text-surface-400" />
        </div>
        <p className="text-base font-semibold text-surface-800">No active project assigned</p>
        <p className="text-sm text-surface-500">
          {projectError ?? 'You are not assigned to an active project.'}
        </p>
        <Button variant="secondary" size="sm" onClick={() => navigate(ROUTES.TEAM_LEAD_WORKSPACE)}>
          Back to Workspace
        </Button>
      </div>
    );
  }

  /* Group photos by Activity Name → Volunteer Name */
  const groupedByActivity = filteredPhotos.reduce<
    Record<string, Record<string, PhotoWithDetails[]>>
  >((acc, photo) => {
    const activityName = photo.activity?.activity_name || 'General Activity';
    const volunteerName = photo.uploader?.person?.full_name || 'Volunteer';

    if (!acc[activityName]) {
      acc[activityName] = {};
    }
    if (!acc[activityName][volunteerName]) {
      acc[activityName][volunteerName] = [];
    }
    acc[activityName][volunteerName].push(photo);
    return acc;
  }, {});

  const activityEntries = Object.entries(groupedByActivity);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* ─── Back & Header ─── */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(ROUTES.TEAM_LEAD_WORKSPACE)}
          className="flex items-center gap-1 text-sm text-surface-500 hover:text-surface-700 transition-colors"
        >
          <ChevronLeft size={16} />
          Back to Team Lead Workspace
        </button>

        <div className="flex items-center gap-1.5 bg-surface-100 px-3 py-1.5 rounded-xl border border-surface-200 text-xs">
          <Filter size={13} className="text-surface-400" />
          <select
            value={selectedActivityId}
            onChange={(e) => setSelectedActivityId(e.target.value)}
            className="bg-transparent text-surface-700 font-medium focus:outline-none cursor-pointer"
          >
            <option value="all">All Activities ({photos.length})</option>
            {activities.map((act) => (
              <option key={act.id} value={act.id}>
                {act.activity_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <h1 className="text-xl font-bold text-surface-900">Activity Photos</h1>
        <p className="text-sm text-surface-500 mt-0.5">{project.camp_name}</p>
      </div>

      {(photosError || actionError) && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          <AlertCircle size={16} className="flex-shrink-0" />
          {photosError ?? actionError}
        </div>
      )}

      {activityEntries.length === 0 ? (
        <Card>
          <EmptyState
            title="No activity photos submitted"
            description="Volunteers have not uploaded any documentation photos for this selection yet."
          />
        </Card>
      ) : (
        /* Render Grouped by Activity → Volunteer per Specification */
        <div className="space-y-8">
          {activityEntries.map(([activityName, volunteersMap]) => (
            <div key={activityName} className="space-y-4 bg-white p-5 rounded-2xl border border-surface-200 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-surface-100">
                <h2 className="text-base font-bold text-surface-900 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
                  {activityName}
                </h2>
                <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
                  {Object.values(volunteersMap).reduce((sum, list) => sum + list.length, 0)} Photos
                </span>
              </div>

              {Object.entries(volunteersMap).map(([volunteerName, volunteerPhotos]) => (
                <div key={volunteerName} className="space-y-2 pl-2 border-l-2 border-surface-100">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-surface-700">
                    <User size={13} className="text-surface-400" />
                    <span>{volunteerName}</span>
                    <span className="text-surface-400 font-normal">({volunteerPhotos.length})</span>
                  </div>

                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                    {volunteerPhotos.map((photo) => (
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
                          {/* Delete photo button for Team Leads */}
                          <button
                            onClick={() => setPhotoToDelete(photo)}
                            title="Delete photo before faculty review"
                            className="absolute bottom-1 right-1 p-1.5 rounded-lg bg-slate-900/70 text-white/90 hover:text-red-400 hover:bg-slate-900 backdrop-blur-md opacity-90 transition-all cursor-pointer"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                        <div className="px-1 text-[10px] text-surface-500 flex items-center justify-between font-medium">
                          <span>
                            {new Date(photo.captured_at).toLocaleTimeString('en-IN', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          {photo.latitude && photo.longitude && (
                            <span className="text-emerald-600 font-bold text-[9px]" title="GPS Location Tagged">
                              GPS
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {photoToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)' }}
          onClick={(e) => e.target === e.currentTarget && !isDeleting && setPhotoToDelete(null)}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5 space-y-3">
            <h3 className="text-base font-semibold text-surface-900">Delete Photo</h3>
            <p className="text-xs text-surface-600 leading-relaxed">
              Delete this photograph before Faculty review? This will remove blurred or unnecessary images.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" disabled={isDeleting} onClick={() => setPhotoToDelete(null)}>
                Cancel
              </Button>
              <Button variant="danger" size="sm" isLoading={isDeleting} onClick={handleDeleteConfirm}>
                Delete Photo
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
        onDelete={(p) => setPhotoToDelete(p as PhotoWithDetails)}
      />
    </div>
  );
}
