import { useState } from 'react';
import { useProjectPhotos } from '@/features/volunteer/hooks/useProjectPhotos';
import { useActivities } from '@/features/activities/hooks/useActivities';
import { PhotoThumbnail } from './PhotoThumbnail';
import { PhotoLightboxModal, type PhotoPreviewData } from './PhotoLightboxModal';
import { Card, Spinner, EmptyState, Button } from '@/components/ui';
import { CheckCircle2, Circle, Trash2, MapPin, Calendar, User, Filter, AlertCircle } from 'lucide-react';
import type { PhotoWithDetails } from '@/features/volunteer/services/photoService';

interface PhotosTabProps {
  campId: string;
}

export function PhotosTab({ campId: projectId }: PhotosTabProps) {
  const { photos, isLoading, error, toggleReportSelection, removePhoto } = useProjectPhotos(projectId);
  const { activities } = useActivities(projectId);

  const [selectedActivityId, setSelectedActivityId] = useState<string>('all');
  const [reportFilter, setReportFilter] = useState<'all' | 'selected' | 'unselected'>('all');
  const [photoToDelete, setPhotoToDelete] = useState<PhotoWithDetails | null>(null);
  const [activePreviewPhoto, setActivePreviewPhoto] = useState<PhotoPreviewData | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const filteredPhotos = photos.filter((photo) => {
    if (selectedActivityId !== 'all' && photo.activity_id !== selectedActivityId) {
      return false;
    }
    if (reportFilter === 'selected' && !photo.is_selected_for_report) {
      return false;
    }
    if (reportFilter === 'unselected' && photo.is_selected_for_report) {
      return false;
    }
    return true;
  });

  const selectedCount = photos.filter((p) => p.is_selected_for_report).length;

  const handleToggleReport = async (photo: PhotoWithDetails) => {
    setActionError(null);
    try {
      await toggleReportSelection(photo.id, !photo.is_selected_for_report);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to update photo selection');
    }
  };

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

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ─── Header & Controls ─── */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-surface-200 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-surface-900">
            Total Photos: <span className="text-primary-600 font-bold">{photos.length}</span>
          </span>
          <span className="text-surface-300">•</span>
          <span className="text-sm font-semibold text-surface-900">
            Selected for Report:{' '}
            <span className="text-emerald-600 font-bold">{selectedCount}</span>
          </span>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Activity Filter */}
          <div className="flex items-center gap-1.5 bg-surface-50 px-3 py-1.5 rounded-xl border border-surface-200 text-xs">
            <Filter size={13} className="text-surface-400" />
            <select
              value={selectedActivityId}
              onChange={(e) => setSelectedActivityId(e.target.value)}
              className="bg-transparent text-surface-700 font-medium focus:outline-none cursor-pointer"
            >
              <option value="all">All Activities</option>
              {activities.map((act) => (
                <option key={act.id} value={act.id}>
                  {act.activity_name}
                </option>
              ))}
            </select>
          </div>

          {/* Report Selection Filter */}
          <div className="flex items-center gap-1.5 bg-surface-50 px-3 py-1.5 rounded-xl border border-surface-200 text-xs">
            <select
              value={reportFilter}
              onChange={(e) => setReportFilter(e.target.value as 'all' | 'selected' | 'unselected')}
              className="bg-transparent text-surface-700 font-medium focus:outline-none cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="selected">Report Selected Only</option>
              <option value="unselected">Unselected Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Error banner */}
      {(error || actionError) && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          <AlertCircle size={16} className="flex-shrink-0" />
          {error ?? actionError}
        </div>
      )}

      {/* Empty State */}
      {filteredPhotos.length === 0 ? (
        <Card>
          <EmptyState
            title={photos.length === 0 ? 'No documentation photos have been uploaded for this project.' : 'No matching photos'}
            description={
              photos.length === 0
                ? 'Documentation photos captured during the project execution will be displayed here.'
                : 'Try clearing or changing your filters.'
            }
          />
        </Card>
      ) : (
        /* Grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredPhotos.map((photo) => (
            <div
              key={photo.id}
              className={`group relative overflow-hidden bg-white rounded-2xl border transition-all duration-200 ${
                photo.is_selected_for_report
                  ? 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-md'
                  : 'border-surface-200 hover:border-surface-300 shadow-sm'
              }`}
            >
              {/* Photo Image */}
              <div className="relative aspect-video w-full overflow-hidden bg-surface-100">
                <PhotoThumbnail
                  path={photo.file_url}
                  alt={photo.activity?.activity_name || 'Camp photo'}
                  onClick={() => setActivePreviewPhoto(photo)}
                />

                {/* Report selection badge toggle button */}
                <button
                  type="button"
                  onClick={() => handleToggleReport(photo)}
                  title={photo.is_selected_for_report ? 'Deselect for Report' : 'Select for Report'}
                  className={`absolute top-2 right-2 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold backdrop-blur-md transition-all cursor-pointer ${
                    photo.is_selected_for_report
                      ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                      : 'bg-slate-900/60 text-white hover:bg-slate-900/80'
                  }`}
                >
                  {photo.is_selected_for_report ? (
                    <>
                      <CheckCircle2 size={14} /> Included in Report
                    </>
                  ) : (
                    <>
                      <Circle size={14} /> Include in Report
                    </>
                  )}
                </button>

                {/* Delete button */}
                <button
                  type="button"
                  onClick={() => setPhotoToDelete(photo)}
                  title="Delete photo"
                  className="absolute bottom-2 right-2 p-1.5 rounded-lg bg-slate-900/60 text-white/80 hover:text-red-400 hover:bg-slate-900/90 backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              {/* Photo Details */}
              <div className="p-3.5 space-y-1.5 text-xs text-surface-500">
                <p className="font-semibold text-surface-800 text-sm truncate">
                  {photo.activity?.activity_name || 'General Activity'}
                </p>

                <div className="flex items-center gap-1.5 text-surface-600">
                  <User size={13} className="text-surface-400 flex-shrink-0" />
                  <span className="truncate">{photo.uploader?.person?.full_name || 'Volunteer'}</span>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-surface-100 text-[11px] text-surface-400">
                  <span className="flex items-center gap-1">
                    <Calendar size={11} />
                    {new Date(photo.captured_at).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </span>

                  {photo.latitude && photo.longitude ? (
                    <span className="flex items-center gap-0.5 text-emerald-600 font-medium" title={`Lat: ${photo.latitude}, Lng: ${photo.longitude}`}>
                      <MapPin size={11} /> GPS
                    </span>
                  ) : (
                    <span>No Location</span>
                  )}
                </div>
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
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-base font-semibold text-surface-900">Delete Photo</h3>
            <p className="text-sm text-surface-600">
              Are you sure you want to permanently delete this photo? This will remove it from both storage and database records.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                disabled={isDeleting}
                onClick={() => setPhotoToDelete(null)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                isLoading={isDeleting}
                onClick={handleDeleteConfirm}
              >
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
        canManageReportSelection
        onToggleReportSelection={(p) => handleToggleReport(p as PhotoWithDetails)}
        canDelete
        onDelete={(p) => setPhotoToDelete(p as PhotoWithDetails)}
      />
    </div>
  );
}
