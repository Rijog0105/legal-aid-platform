import { useState, useEffect, type FC } from 'react';
import {
  Camera,
  Trash2,
  ArrowUp,
  ArrowDown,
  Maximize2,
  ZoomIn,
  Image as ImageIcon,
  CheckCircle2,
  X,
  Plus,
} from 'lucide-react';
import {
  type FinalReportPhotoItem,
  type AvailableCampPhoto,
  fetchAvailableCampPhotos,
} from '../services/finalReportService';
import { Spinner } from '@/components/ui';

interface ReportPhotoManagerProps {
  projectId: string;
  photos: FinalReportPhotoItem[];
  onChange: (photos: FinalReportPhotoItem[]) => void;
}

export const ReportPhotoManager: FC<ReportPhotoManagerProps> = ({
  projectId,
  photos,
  onChange,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [availablePhotos, setAvailablePhotos] = useState<AvailableCampPhoto[]>([]);
  const [isLoadingAvailable, setIsLoadingAvailable] = useState(false);

  useEffect(() => {
    if (isModalOpen && availablePhotos.length === 0) {
      setIsLoadingAvailable(true);
      fetchAvailableCampPhotos(projectId)
        .then((data) => {
          setAvailablePhotos(data);
          setIsLoadingAvailable(false);
        })
        .catch((err) => {
          console.error('Failed to load camp photos:', err);
          setIsLoadingAvailable(false);
        });
    }
  }, [isModalOpen, projectId, availablePhotos.length]);

  const toggleCampPhotoSelection = (item: AvailableCampPhoto) => {
    const isAlreadySelected = photos.some((p) => p.id === item.id || p.url === item.url);
    if (isAlreadySelected) {
      onChange(photos.filter((p) => p.id !== item.id && p.url !== item.url));
    } else {
      onChange([
        ...photos,
        {
          id: item.id,
          url: item.url,
          caption: item.caption || item.activityName,
          aspectRatio: '16:9',
          displayWidth: 'full',
          scalePercent: 100,
        },
      ]);
    }
  };

  const updatePhoto = (id: string, updates: Partial<FinalReportPhotoItem>) => {
    onChange(photos.map((p) => (p.id === id ? { ...p, ...updates } : p)));
  };

  const removePhoto = (id: string) => {
    onChange(photos.filter((p) => p.id !== id));
  };

  const movePhoto = (index: number, direction: 'up' | 'down') => {
    const newIdx = direction === 'up' ? index - 1 : index + 1;
    if (newIdx < 0 || newIdx >= photos.length) return;
    const next = [...photos];
    const [moved] = next.splice(index, 1);
    next.splice(newIdx, 0, moved);
    onChange(next);
  };

  return (
    <div className="space-y-3 font-sans">
        {/* Camp Photos Header & Selector Button */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-200 gap-2">
          <div>
            <span className="text-xs font-bold text-slate-800 block">Camp Documentation Photos</span>
            <span className="text-[11px] text-slate-500">
              {photos.length} photo{photos.length !== 1 ? 's' : ''} in final report
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer min-h-[38px] shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Select Photos</span>
          </button>
        </div>

        {/* Selected Photos List & Edit Controls */}
        {photos.length === 0 ? (
          <div className="text-center py-6 px-3 bg-slate-50 rounded-xl border border-dashed border-slate-300">
            <ImageIcon className="w-7 h-7 text-slate-400 mx-auto mb-1.5" />
            <p className="text-xs font-medium text-slate-600">No camp photos selected</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Click "Select Photos" to choose pictures taken during the camp.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-0.5">
            {photos.map((photo, idx) => (
              <div
                key={photo.id}
                className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-2 hover:border-slate-300 transition-all text-xs"
              >
                {/* Header: Thumbnail + Caption */}
                <div className="flex items-center gap-2">
                  <div className="w-14 h-11 bg-slate-100 rounded-lg overflow-hidden shrink-0 border border-slate-200 relative">
                    <img
                      src={photo.url}
                      alt={photo.caption || 'Camp photo'}
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute bottom-0 right-0 bg-slate-900/80 text-white text-[9px] px-1 font-semibold rounded-tl">
                      #{idx + 1}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <input
                      type="text"
                      value={photo.caption || ''}
                      onChange={(e) => updatePhoto(photo.id, { caption: e.target.value })}
                      placeholder="Enter photo caption..."
                      className="w-full text-xs text-slate-800 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-slate-500 bg-slate-50/50"
                    />
                  </div>

                  {/* Reorder & Remove Controls */}
                  <div className="flex items-center gap-0.5 shrink-0">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => movePhoto(idx, 'up')}
                      className="p-1.5 text-slate-400 hover:text-slate-700 disabled:opacity-25 rounded cursor-pointer min-h-[32px] min-w-[32px] flex items-center justify-center"
                      title="Move up"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === photos.length - 1}
                      onClick={() => movePhoto(idx, 'down')}
                      className="p-1.5 text-slate-400 hover:text-slate-700 disabled:opacity-25 rounded cursor-pointer min-h-[32px] min-w-[32px] flex items-center justify-center"
                      title="Move down"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removePhoto(photo.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded cursor-pointer min-h-[32px] min-w-[32px] flex items-center justify-center"
                      title="Remove photo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Crop & Display Controls */}
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
                  <div>
                    <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1 flex items-center gap-1">
                      <Maximize2 className="w-3 h-3 text-slate-400" />
                      Crop / Ratio
                    </label>
                    <select
                      value={photo.aspectRatio}
                      onChange={(e) =>
                        updatePhoto(photo.id, {
                          aspectRatio: e.target.value as FinalReportPhotoItem['aspectRatio'],
                        })
                      }
                      className="w-full text-[11px] text-slate-700 border border-slate-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:border-slate-500"
                    >
                      <option value="16:9">16:9 Landscape</option>
                      <option value="4:3">4:3 Standard</option>
                      <option value="1:1">1:1 Square</option>
                      <option value="original">Original</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1 flex items-center gap-1">
                      <ZoomIn className="w-3 h-3 text-slate-400" />
                      Display Width
                    </label>
                    <select
                      value={photo.displayWidth}
                      onChange={(e) =>
                        updatePhoto(photo.id, {
                          displayWidth: e.target.value as FinalReportPhotoItem['displayWidth'],
                        })
                      }
                      className="w-full text-[11px] text-slate-700 border border-slate-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:border-slate-500"
                    >
                      <option value="full">Full Width</option>
                      <option value="half">Half Width</option>
                    </select>
                  </div>
                </div>

                {/* Size Slider */}
                <div className="flex items-center justify-between gap-2 pt-1">
                  <span className="text-[10px] text-slate-500 font-medium">Display Size:</span>
                  <input
                    type="range"
                    min="60"
                    max="100"
                    step="5"
                    value={photo.scalePercent}
                    onChange={(e) =>
                      updatePhoto(photo.id, { scalePercent: Number(e.target.value) })
                    }
                    className="w-24 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-800"
                  />
                  <span className="text-[10px] font-medium text-slate-700 w-8 text-right">
                    {photo.scalePercent}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ──────────────────────────────────────────────────────────
            MODAL: SELECT PHOTOS FROM CAMP GALLERY
            ────────────────────────────────────────────────────────── */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 flex flex-col max-h-[92vh] sm:max-h-[85vh] overflow-hidden animate-in fade-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200">
              {/* Modal Header */}
              <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <Camera className="w-5 h-5 text-slate-700 shrink-0" />
                  <div className="min-w-0">
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                      Select Photos from Camp Activities
                    </h3>
                    <p className="text-[10px] sm:text-[11px] text-slate-500 truncate">
                      Choose photos taken by volunteers during camp proceedings
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Photos Grid */}
              <div className="p-3 sm:p-6 overflow-y-auto flex-1">
                {isLoadingAvailable ? (
                  <div className="flex flex-col items-center justify-center py-12 space-y-2">
                    <Spinner size="md" />
                    <p className="text-xs text-slate-500">Loading photos from camp repository...</p>
                  </div>
                ) : availablePhotos.length === 0 ? (
                  <div className="text-center py-12 px-4 space-y-2">
                    <Camera className="w-8 h-8 text-slate-300 mx-auto" />
                    <p className="text-xs font-semibold text-slate-700">No photos found for this camp</p>
                    <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                      Photos documented by student volunteers and team leads during camp activities will appear here for selection.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3.5">
                    {availablePhotos.map((item) => {
                      const isSelected = photos.some(
                        (p) => p.id === item.id || p.url === item.url
                      );
                      return (
                        <div
                          key={item.id}
                          onClick={() => toggleCampPhotoSelection(item)}
                          className={`group relative rounded-xl border-2 overflow-hidden cursor-pointer transition-all ${
                            isSelected
                              ? 'border-indigo-600 ring-2 ring-indigo-500/20 shadow-sm'
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className="aspect-4/3 w-full bg-slate-100 overflow-hidden">
                            <img
                              src={item.url}
                              alt={item.caption || item.activityName}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                            />
                          </div>

                          {/* Selected Checkmark Badge */}
                          <div
                            className={`absolute top-2 right-2 rounded-full p-1 transition-all ${
                              isSelected
                                ? 'bg-indigo-600 text-white'
                                : 'bg-slate-900/60 text-white/80'
                            }`}
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </div>

                          {/* Activity Name Tag */}
                          <div className="p-2 bg-white">
                            <p className="text-[11px] font-semibold text-slate-800 truncate">
                              {item.activityName}
                            </p>
                            {item.caption && item.caption !== item.activityName && (
                              <p className="text-[10px] text-slate-500 truncate mt-0.5">
                                {item.caption}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="px-4 sm:px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                <span className="text-[11px] sm:text-xs font-medium text-slate-600">
                  {photos.length} photo{photos.length !== 1 ? 's' : ''} selected
                </span>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer min-h-[38px]"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
};
