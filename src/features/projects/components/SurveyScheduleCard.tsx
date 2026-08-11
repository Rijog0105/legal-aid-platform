import { Calendar, Clock, MapPin, ArrowRight, AlertCircle } from 'lucide-react';
import { Card, Button } from '@/components/ui';
import type { Project } from '@/types';
import { formatDate, formatTime } from '@/utils';

interface SurveyScheduleCardProps {
  project: Project;
  onNavigateToSchedule: () => void;
}

export function SurveyScheduleCard({ project, onNavigateToSchedule }: SurveyScheduleCardProps) {
  const settings = project.report_settings;
  const isScheduled = !!settings?.survey_date;

  return (
    <Card className="p-4 rounded-2xl border border-slate-200 bg-white shadow-sm flex flex-col justify-between h-full">
      <div className="flex flex-col justify-between flex-1 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0">
              <Calendar className="w-4.5 h-4.5 text-blue-650" />
            </div>
            <div>
              <h3 className="text-xs font-extrabold text-slate-900 leading-tight">Survey Schedule</h3>
              <span
                className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full inline-block mt-0.5 uppercase tracking-wide border ${
                  isScheduled
                    ? 'bg-blue-50 text-blue-700 border-blue-100'
                    : 'bg-amber-50 text-amber-700 border-amber-100'
                }`}
              >
                {isScheduled ? 'Scheduled' : 'Not Scheduled'}
              </span>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            rightIcon={<ArrowRight size={10} />}
            onClick={onNavigateToSchedule}
            className="border-slate-200 hover:bg-slate-50 font-bold py-1 px-2.5 text-[10px]"
          >
            {isScheduled ? 'Edit' : 'Schedule'}
          </Button>
        </div>

        {/* Body */}
        {isScheduled ? (
          <div className="grid grid-cols-3 gap-2 flex-grow">
            <div className="bg-slate-50/50 p-2 rounded-xl border border-slate-100 flex flex-col justify-center">
              <span className="text-[8px] text-slate-450 font-bold block mb-0.5 uppercase tracking-wider">Date</span>
              <span className="text-[10px] font-extrabold text-slate-800 leading-tight block truncate">
                {formatDate(settings!.survey_date!)}
              </span>
            </div>
            <div className="bg-slate-50/50 p-2 rounded-xl border border-slate-100 flex flex-col justify-center">
              <span className="text-[8px] text-slate-450 font-bold block mb-0.5 uppercase tracking-wider">Hours</span>
              <span className="text-[10px] font-extrabold text-slate-800 flex items-center gap-1">
                <Clock size={10} className="text-slate-400 flex-shrink-0" />
                <span className="truncate">
                  {settings?.survey_start_time ? formatTime(settings.survey_start_time) : '—'}
                  {' – '}
                  {settings?.survey_end_time ? formatTime(settings.survey_end_time) : '—'}
                </span>
              </span>
            </div>
            <div className="bg-slate-50/50 p-2 rounded-xl border border-slate-100 flex flex-col justify-center">
              <span className="text-[8px] text-slate-450 font-bold block mb-0.5 uppercase tracking-wider">Location</span>
              <span className="text-[10px] font-extrabold text-slate-800 flex items-center gap-1">
                <MapPin size={10} className="text-slate-400 flex-shrink-0" />
                <span className="truncate" title={settings?.survey_location ?? project.village_name}>
                  {settings?.survey_location ?? project.village_name}
                </span>
              </span>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2 px-3 py-3 bg-amber-50/50 border border-amber-100 rounded-xl flex-grow">
            <AlertCircle size={12} className="text-amber-500 flex-shrink-0" />
            <p className="text-[10px] text-amber-800 leading-relaxed font-semibold">
              The survey schedule has not been configured yet. Set it up.
            </p>
          </div>
        )}

        {/* Optional Notes */}
        {isScheduled && settings?.survey_notes ? (
          <div className="px-3 py-2 bg-slate-50/50 border border-slate-100 rounded-xl">
            <p className="text-[10px] text-slate-500 leading-snug line-clamp-1 font-semibold">
              <span className="text-slate-400 font-extrabold mr-1">Note:</span>
              {settings.survey_notes}
            </p>
          </div>
        ) : (
          <div className="h-1" />
        )}
      </div>
    </Card>
  );
}
