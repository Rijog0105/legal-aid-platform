import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2, MapPin, User, Filter, AlertCircle, Camera } from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useMyProjectAssignment } from '@/features/volunteer/hooks/useMyProjectAssignment';
import { useProjectPhotos } from '@/features/volunteer/hooks/useProjectPhotos';
import { useActivities } from '@/features/activities/hooks/useActivities';
import { PhotoThumbnail } from '@/features/volunteer/components/PhotoThumbnail';
import { PhotoLightboxModal, type PhotoPreviewData } from '@/features/volunteer/components/PhotoLightboxModal';
import { Spinner } from '@/components/ui';
import { ROUTES } from '@/constants';
import type { PhotoWithDetails } from '@/features/volunteer/services/photoService';

export function TeamLeadPhotosPage() {
  const { personId } = useAuth();
  const navigate = useNavigate();

  const { project, isLoading: projectLoading, error: projectError } = useMyProjectAssignment(personId);
  const { photos, isLoading: photosLoading, error: photosError, removePhoto } = useProjectPhotos(
    project?.id ?? null
  );
  const { activities } = useActivities(project?.id);

  const [phaseFilter, setPhaseFilter] = useState<'all' | 'survey' | 'camp'>('all');
  const [selectedActivityId, setSelectedActivityId] = useState<string>('all');
  const [photoToDelete, setPhotoToDelete] = useState<PhotoWithDetails | null>(null);
  const [activePreviewPhoto, setActivePreviewPhoto] = useState<PhotoPreviewData | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const filteredPhotos = photos.filter((photo) => {
    if (phaseFilter !== 'all' && photo.activity?.phase !== phaseFilter) {
      return false;
    }
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
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-center max-w-md mx-auto">
        <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
          <MapPin size={24} />
        </div>
        <h2 className="text-base font-bold text-slate-900">No Active Assignment</h2>
        <p className="text-xs text-slate-500">
          {projectError ?? 'You are not assigned to an active project.'}
        </p>
        <button
          onClick={() => navigate(ROUTES.TEAM_LEAD_WORKSPACE)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer mt-2"
        >
          Back to Workspace
        </button>
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
    <div className="space-y-6 max-w-5xl mx-auto animate-fade-in pb-12">
      {/* ─── Back & Header ─── */}
      <button
        onClick={() => navigate(ROUTES.TEAM_LEAD_WORKSPACE)}
        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors cursor-pointer"
      >
        <ArrowLeft size={14} />
        <span>Back to Team Lead Workspace</span>
      </button>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Activity Documentation Photos</h1>
          <p className="text-xs text-slate-500 mt-0.5">{project.camp_name}</p>
        </div>

        <div className="flex items-center gap-2">
          {/* Phase Filter Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200">
            {(['all', 'survey', 'camp'] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => {
                  setPhaseFilter(p);
                  setSelectedActivityId('all');
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  phaseFilter === p
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {p === 'all' ? 'All' : p === 'survey' ? 'Survey' : 'Camp'}
              </button>
            ))}
          </div>

          {/* Activity Dropdown Filter */}
          <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-2xl border border-slate-200 text-xs shadow-2xs">
            <Filter size={13} className="text-slate-400" />
            <select
              value={selectedActivityId}
              onChange={(e) => setSelectedActivityId(e.target.value)}
              className="bg-transparent text-slate-700 font-bold focus:outline-none cursor-pointer text-xs"
            >
              <option value="all">All Activities ({photos.length})</option>
              {activities
                .filter((act) => phaseFilter === 'all' || act.phase === phaseFilter)
                .map((act) => (
                  <option key={act.id} value={act.id}>
                    {act.activity_name}
                  </option>
                ))}
            </select>
          </div>
        </div>
      </div>

      {(photosError || actionError) && (
        <div className="flex items-center gap-2 p-3.5 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-xs font-medium">
          <AlertCircle size={16} className="shrink-0" />
          <span>{photosError ?? actionError}</span>
        </div>
      )}

      {activityEntries.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-3xl border border-slate-200 shadow-sm space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
            <Camera size={24} />
          </div>
          <h3 className="text-sm font-bold text-slate-900">No Documentation Photos</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Volunteers have not uploaded any activity documentation photos for the selected category yet.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {activityEntries.map(([activityName, volunteersMap]) => (
            <div key={activityName} className="space-y-4 bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                  <h2 className="text-sm font-bold text-slate-900">{activityName}</h2>
                </div>
                <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-3 py-0.5 rounded-full">
                  {Object.values(volunteersMap).reduce((sum, list) => sum + list.length, 0)} Photos
                </span>
              </div>

              {Object.entries(volunteersMap).map(([volunteerName, volunteerPhotos]) => (
                <div key={volunteerName} className="space-y-2.5 pl-3 border-l-2 border-slate-200">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                    <User size={13} className="text-slate-400" />
                    <span>{volunteerName}</span>
                    <span className="text-slate-400 font-normal">({volunteerPhotos.length})</span>
                  </div>

                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                    {volunteerPhotos.map((photo) => (
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
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {photoToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in"
          onClick={(e) => e.target === e.currentTarget && !isDeleting && setPhotoToDelete(null)}
        >
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 space-y-3 border border-slate-200">
            <h3 className="text-base font-bold text-slate-900">Delete Photo</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Remove this photo from the project documentation archive?
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
                onClick={handleDeleteConfirm}
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
        onDelete={(p) => setPhotoToDelete(p as PhotoWithDetails)}
      />
    </div>
  );
}
