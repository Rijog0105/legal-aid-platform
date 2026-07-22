import { useEffect, useState } from 'react';
import { X, Calendar, MapPin, User, CheckCircle2, Circle, Trash2, ImageOff } from 'lucide-react';
import { getSignedPhotoUrl } from '@/features/volunteer/services/photoService';
import { Button } from '@/components/ui';

export interface PhotoPreviewData {
  id: string;
  file_url: string;
  captured_at: string;
  latitude?: number | null;
  longitude?: number | null;
  is_selected_for_report?: boolean;
  activity?: { activity_name: string } | null;
  uploader?: { person?: { full_name?: string } | null } | null;
}

interface PhotoLightboxModalProps {
  photo: PhotoPreviewData | null;
  isOpen: boolean;
  onClose: () => void;
  onToggleReportSelection?: (photo: PhotoPreviewData) => Promise<void> | void;
  onDelete?: (photo: PhotoPreviewData) => void;
  canManageReportSelection?: boolean;
  canDelete?: boolean;
}

export function PhotoLightboxModal({
  photo,
  isOpen,
  onClose,
  onToggleReportSelection,
  onDelete,
  canManageReportSelection = false,
  canDelete = false,
}: PhotoLightboxModalProps) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isToggling, setIsToggling] = useState(false);

  useEffect(() => {
    if (!isOpen || !photo) {
      setSignedUrl(null);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setHasError(false);

    getSignedPhotoUrl(photo.file_url, 3600).then((url) => {
      if (cancelled) return;
      if (url) {
        setSignedUrl(url);
      } else {
        setHasError(true);
      }
      setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [isOpen, photo]);

  if (!isOpen || !photo) return null;

  const activityName = photo.activity?.activity_name || 'General Activity';
  const uploaderName = photo.uploader?.person?.full_name || 'Volunteer';

  const handleToggleReport = async () => {
    if (!onToggleReportSelection || isToggling) return;
    setIsToggling(true);
    try {
      await onToggleReportSelection(photo);
    } finally {
      setIsToggling(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative bg-surface-900 border border-surface-800 rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-surface-800 bg-surface-950/50">
          <div className="flex items-center gap-2 truncate">
            <span className="w-2.5 h-2.5 rounded-full bg-primary-500 shrink-0" />
            <h3 className="text-sm font-bold text-white truncate">{activityName}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-surface-400 hover:text-white hover:bg-surface-800 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Uncropped Full Image Area */}
        <div className="relative flex-1 bg-black/60 min-h-[300px] flex items-center justify-center p-4 overflow-hidden">
          {isLoading && (
            <div className="flex flex-col items-center justify-center gap-2 text-surface-400">
              <div className="w-8 h-8 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
              <span className="text-xs">Loading full image...</span>
            </div>
          )}

          {hasError && (
            <div className="flex flex-col items-center justify-center gap-2 text-red-400 text-xs">
              <ImageOff size={24} />
              <span>Failed to load high-resolution preview</span>
            </div>
          )}

          {!isLoading && !hasError && signedUrl && (
            <img
              src={signedUrl}
              alt={activityName}
              className="max-h-[65vh] w-auto max-w-full object-contain rounded-lg shadow-lg select-none"
            />
          )}
        </div>

        {/* Modal Footer / Metadata Bar */}
        <div className="p-4 border-t border-surface-800 bg-surface-950/80 text-xs text-surface-300 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Metadata Info */}
            <div className="flex flex-wrap items-center gap-4 text-surface-300">
              <div className="flex items-center gap-1.5 font-medium">
                <User size={13} className="text-primary-400" />
                <span>{uploaderName}</span>
              </div>

              <div className="flex items-center gap-1.5 text-surface-400">
                <Calendar size={13} />
                <span>
                  {new Date(photo.captured_at).toLocaleString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>

              {photo.latitude && photo.longitude ? (
                <div className="flex items-center gap-1 text-emerald-400 font-semibold">
                  <MapPin size={13} />
                  <span>GPS Tagged ({photo.latitude.toFixed(4)}, {photo.longitude.toFixed(4)})</span>
                </div>
              ) : (
                <span className="text-surface-500">No Location Data</span>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              {canManageReportSelection && onToggleReportSelection && (
                <button
                  type="button"
                  onClick={handleToggleReport}
                  disabled={isToggling}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold text-xs transition-all cursor-pointer ${
                    photo.is_selected_for_report
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                      : 'bg-surface-800 text-surface-200 hover:bg-surface-700'
                  }`}
                >
                  {photo.is_selected_for_report ? (
                    <>
                      <CheckCircle2 size={14} /> Selected for Report
                    </>
                  ) : (
                    <>
                      <Circle size={14} /> Include in Report
                    </>
                  )}
                </button>
              )}

              {canDelete && onDelete && (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => {
                    onClose();
                    onDelete(photo);
                  }}
                  className="flex items-center gap-1"
                >
                  <Trash2 size={13} />
                  <span>Delete</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
