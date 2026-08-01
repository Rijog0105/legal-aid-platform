import { Calendar, Clock, MapPin, ArrowRight, AlertCircle } from 'lucide-react';
import { Card, Button } from '@/components/ui';
import type { Project } from '@/types';
import { formatDate, formatTime } from '@/utils';

interface CampScheduleCardProps {
  project: Project;
  onNavigateToSchedule: () => void;
}

/**
 * Read-only display card for the Camp Phase schedule.
 * Used exclusively in the Overview tab. Editing is done in Camp Phase → Schedule Camp.
 */
export function CampScheduleCard({ project, onNavigateToSchedule }: CampScheduleCardProps) {
  const settings = project.report_settings;
  const isScheduled =
    !!(project.camp_date && project.camp_date !== new Date().toISOString().split('T')[0]) ||
    !!settings?.camp_notes ||
    !!project.start_time;

  return (
    <Card className="p-5 space-y-4 h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
            <Calendar className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-surface-900 leading-tight">Camp Schedule</h3>
            <span
              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full inline-block mt-0.5 ${
                isScheduled
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-amber-50 text-amber-700'
              }`}
            >
              {isScheduled ? 'Scheduled' : 'Not Scheduled'}
            </span>
          </div>
        </div>
        <Button
          size="sm"
          variant="outline"
          rightIcon={<ArrowRight size={12} />}
          onClick={onNavigateToSchedule}
        >
          {isScheduled ? 'Edit' : 'Schedule'}
        </Button>
      </div>

      {/* Body */}
      {isScheduled ? (
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-surface-50 p-2.5 rounded-xl border border-surface-100">
            <span className="text-[10px] text-surface-400 block mb-0.5 uppercase tracking-wide">Date</span>
            <span className="text-xs font-semibold text-surface-800 leading-tight">
              {formatDate(project.camp_date)}
            </span>
          </div>
          <div className="bg-surface-50 p-2.5 rounded-xl border border-surface-100">
            <span className="text-[10px] text-surface-400 block mb-0.5 uppercase tracking-wide">Hours</span>
            <span className="text-xs font-semibold text-surface-800 flex items-center gap-1">
              <Clock size={10} className="text-surface-400 flex-shrink-0" />
              <span className="truncate">
                {project.start_time ? formatTime(project.start_time) : '—'}
                {' – '}
                {project.end_time ? formatTime(project.end_time) : '—'}
              </span>
            </span>
          </div>
          <div className="bg-surface-50 p-2.5 rounded-xl border border-surface-100">
            <span className="text-[10px] text-surface-400 block mb-0.5 uppercase tracking-wide">Venue</span>
            <span className="text-xs font-semibold text-surface-800 flex items-center gap-1">
              <MapPin size={10} className="text-surface-400 flex-shrink-0" />
              <span className="truncate">{settings?.venue ?? project.village_name}</span>
            </span>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-2 px-3 py-2.5 bg-amber-50 border border-amber-100 rounded-xl">
          <AlertCircle size={13} className="text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700 leading-relaxed">
            The camp phase schedule has not been configured yet. Click "Schedule" to set it up.
          </p>
        </div>
      )}

      {settings?.camp_notes && (
        <div className="px-3 py-2.5 bg-surface-50 border border-surface-100 rounded-xl">
          <span className="text-[10px] text-surface-400 uppercase tracking-wide block mb-1">Notes</span>
          <p className="text-xs text-surface-600 leading-relaxed line-clamp-2">{settings.camp_notes}</p>
        </div>
      )}
    </Card>
  );
}
