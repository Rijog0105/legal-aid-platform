import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Images, MapPin, AlertCircle } from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useMyCampAssignment } from '@/features/volunteer/hooks/useMyCampAssignment';
import { useMyPhotos } from '@/features/volunteer/hooks/useMyPhotos';
import { PhotoThumbnail } from '@/features/volunteer/components/PhotoThumbnail';
import { Spinner, Button, Card } from '@/components/ui';
import { ROUTES } from '@/constants';

export function MySubmissionsPage() {
  const { personId, userId } = useAuth();
  const navigate = useNavigate();

  const { camp, isLoading: campLoading, error: campError } = useMyCampAssignment(personId);
  const { photos, isLoading: photosLoading, error: photosError } = useMyPhotos(
    camp?.id ?? null,
    userId
  );

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

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-surface-900">My Submissions</h1>
          <p className="text-sm text-surface-500 mt-0.5">{camp.camp_name}</p>
        </div>
        <div className="px-3 py-1 rounded-full bg-primary-50 text-primary-700 text-xs font-semibold">
          {photos.length} Photo{photos.length !== 1 ? 's' : ''}
        </div>
      </div>

      {photosError && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          <AlertCircle size={16} className="flex-shrink-0" />
          {photosError}
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
              Photos you capture during activities will appear here.
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
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {photos.map((photo) => (
            <div
              key={photo.id}
              className="group relative overflow-hidden bg-white rounded-2xl border border-surface-200 shadow-sm p-2 space-y-2"
            >
              <PhotoThumbnail path={photo.file_url} alt={photo.activity?.activity_name || 'My photo'} />
              <div className="px-1 text-xs">
                <p className="font-medium text-surface-800 truncate">
                  {photo.activity?.activity_name || 'General Activity'}
                </p>
                <p className="text-[11px] text-surface-400 mt-0.5">
                  {new Date(photo.captured_at).toLocaleTimeString('en-IN', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
