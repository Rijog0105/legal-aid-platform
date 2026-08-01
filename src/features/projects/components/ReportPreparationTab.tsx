import { Card, Button, Badge, Spinner } from '@/components/ui';
import { CheckCircle2, AlertCircle, FileText, Camera, Calendar, ArrowRight, Sparkles, Wand2, Eye, FileCheck, Palette } from 'lucide-react';
import { useActivities } from '@/features/activities/hooks/useActivities';
import { useProjectPhotos } from '@/features/volunteer/hooks/useProjectPhotos';
import { useNarratives } from '../hooks/useNarratives';
import { NarrativesTab } from './NarrativesTab';

interface ReportPreparationTabProps {
  projectId: string;
  onNavigateTab: (tabKey: 'activities' | 'photos') => void;
}

export function ReportPreparationTab({ projectId, onNavigateTab }: ReportPreparationTabProps) {
  const { activities, isLoading: activitiesLoading } = useActivities(projectId);
  const { photos, isLoading: photosLoading } = useProjectPhotos(projectId);
  const { narratives, isLoading: narrativesLoading } = useNarratives(projectId);

  const isLoading = activitiesLoading || photosLoading || narrativesLoading;

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  const selectedPhotos = photos.filter((p) => p.is_selected_for_report);
  const filledNarratives = narratives.filter((n) => n.content && n.content.trim().length > 0);

  const isActivitiesReady = activities.length > 0;
  const isPhotosReady = selectedPhotos.length > 0;
  const isNarrativesReady = filledNarratives.length >= 3; // at least 3 sections filled

  const completedSteps = (isActivitiesReady ? 1 : 0) + (isPhotosReady ? 1 : 0) + (isNarrativesReady ? 1 : 0);
  const isFullyReady = completedSteps === 3;

  const handleActionClick = (actionName: string) => {
    alert(`${actionName} engine will be integrated in Phase 8 (Report Studio).`);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* ─── Header & Notice ─── */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-6 rounded-3xl shadow-lg space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-bold">Report Workspace</h2>
          </div>
          <Badge variant={isFullyReady ? 'success' : 'warning'}>
            {isFullyReady ? 'Ready for Generation' : 'Preparation In Progress'}
          </Badge>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
          Curate activities, select featured documentation photos, and draft narrative sections. All prepared content is persisted in real time for institutional report compilation.
        </p>
      </div>

      {/* ─── Action Buttons Workspace Controls ─── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Button
          onClick={() => handleActionClick('Draft Report Generation')}
          className="flex items-center justify-center gap-1.5 h-12 text-xs font-bold"
          variant="primary"
          leftIcon={<Wand2 size={15} />}
        >
          Generate Draft
        </Button>
        <Button
          onClick={() => handleActionClick('Interactive Preview')}
          className="flex items-center justify-center gap-1.5 h-12 text-xs font-bold"
          variant="outline"
          leftIcon={<Eye size={15} />}
        >
          Preview Draft
        </Button>
        <Button
          onClick={() => handleActionClick('Final Report Generation')}
          className="flex items-center justify-center gap-1.5 h-12 text-xs font-bold"
          variant="secondary"
          leftIcon={<FileCheck size={15} />}
        >
          Generate Final
        </Button>
        <Button
          disabled
          className="flex items-center justify-center gap-1.5 h-12 text-xs font-bold opacity-60 cursor-not-allowed"
          variant="outline"
          leftIcon={<Palette size={15} />}
        >
          Designer (Soon)
        </Button>
      </div>

      {/* ─── Report Readiness Checklist ─── */}
      <Card className="p-5 space-y-4 border-surface-200">
        <div className="flex items-center justify-between pb-3 border-b border-surface-100">
          <div>
            <h3 className="text-base font-bold text-surface-900">Report Content Readiness</h3>
            <p className="text-xs text-surface-500 mt-0.5">
              Checklist of required data modules for institutional report compilation
            </p>
          </div>
          <span className="text-xs font-bold text-primary-700 bg-primary-50 px-3 py-1 rounded-full">
            {completedSteps} / 3 Completed
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Step 1: Activities */}
          <div
            onClick={() => onNavigateTab('activities')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
              isActivitiesReady
                ? 'bg-emerald-50/50 border-emerald-200 hover:bg-emerald-50'
                : 'bg-surface-50 border-surface-200 hover:bg-surface-100'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <Calendar size={18} className={isActivitiesReady ? 'text-emerald-600' : 'text-surface-400'} />
              {isActivitiesReady ? (
                <CheckCircle2 size={16} className="text-emerald-600" />
              ) : (
                <AlertCircle size={16} className="text-surface-400" />
              )}
            </div>
            <h4 className="text-sm font-bold text-surface-900">1. Activity Sequence</h4>
            <p className="text-xs text-surface-500 mt-1">
              {activities.length} activity{activities.length !== 1 ? 'ies' : ''} ordered
            </p>
            <div className="mt-3 flex items-center gap-1 text-[11px] font-semibold text-primary-600">
              <span>Order Timeline</span>
              <ArrowRight size={12} />
            </div>
          </div>

          {/* Step 2: Photos */}
          <div
            onClick={() => onNavigateTab('photos')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
              isPhotosReady
                ? 'bg-emerald-50/50 border-emerald-200 hover:bg-emerald-50'
                : 'bg-surface-50 border-surface-200 hover:bg-surface-100'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <Camera size={18} className={isPhotosReady ? 'text-emerald-600' : 'text-surface-400'} />
              {isPhotosReady ? (
                <CheckCircle2 size={16} className="text-emerald-600" />
              ) : (
                <AlertCircle size={16} className="text-surface-400" />
              )}
            </div>
            <h4 className="text-sm font-bold text-surface-900">2. Photo Selection</h4>
            <p className="text-xs text-surface-500 mt-1">
              {selectedPhotos.length} photo{selectedPhotos.length !== 1 ? 's' : ''} selected
            </p>
            <div className="mt-3 flex items-center gap-1 text-[11px] font-semibold text-primary-600">
              <span>Curate Gallery</span>
              <ArrowRight size={12} />
            </div>
          </div>

          {/* Step 3: Narratives */}
          <div
            className={`p-4 rounded-2xl border transition-all ${
              isNarrativesReady
                ? 'bg-emerald-50/50 border-emerald-200'
                : 'bg-surface-50 border-surface-200'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <FileText size={18} className={isNarrativesReady ? 'text-emerald-600' : 'text-surface-400'} />
              {isNarrativesReady ? (
                <CheckCircle2 size={16} className="text-emerald-600" />
              ) : (
                <AlertCircle size={16} className="text-surface-400" />
              )}
            </div>
            <h4 className="text-sm font-bold text-surface-900">3. Narrative Sections</h4>
            <p className="text-xs text-surface-500 mt-1">
              {filledNarratives.length} / 5 sections drafted
            </p>
            <div className="mt-3 text-[11px] font-semibold text-surface-400">
              <span>Scroll down to edit</span>
            </div>
          </div>
        </div>
      </Card>

      {/* ─── Narrative Editors View (Cohesive single workspace) ─── */}
      <div className="border-t border-surface-200 pt-6">
        <NarrativesTab campId={projectId} />
      </div>
    </div>
  );
}
