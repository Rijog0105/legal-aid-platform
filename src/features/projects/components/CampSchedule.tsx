import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Input } from '@/components/ui';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { ROLES } from '@/constants';
import type { Project } from '@/types';
import { updateProject } from '@/features/projects/services/projectService';
import { Calendar, Clock, Edit, FileText, MapPin } from 'lucide-react';
import { formatDate } from '@/utils';

const schema = z.object({
  camp_date: z.string().min(1, 'Camp date is required'),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  venue: z.string().min(1, 'Venue is required'),
  camp_notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface CampScheduleProps {
  project: Project;
  onUpdate: () => void;
}

export function CampSchedule({ project, onUpdate }: CampScheduleProps) {
  const { hasRole } = useAuth();
  const canEdit = hasRole([ROLES.FACULTY, ROLES.ADMIN]);
  const [isEditing, setIsEditing] = useState(false);

  const currentSettings = project.report_settings;
  const isScheduled = !!project.camp_date && project.camp_date !== new Date().toISOString().split('T')[0] || !!currentSettings?.camp_notes || !!project.start_time;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      camp_date: project.camp_date ?? '',
      start_time: project.start_time ?? '',
      end_time: project.end_time ?? '',
      venue: currentSettings?.venue ?? project.village_name ?? '',
      camp_notes: currentSettings?.camp_notes ?? '',
    },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      await updateProject(project.id, {
        camp_date: values.camp_date,
        start_time: values.start_time || null,
        end_time: values.end_time || null,
        village_name: values.venue,
        report_settings: {
          ...currentSettings,
          camp_notes: values.camp_notes || undefined,
          venue: values.venue,
        },
      });
      setIsEditing(false);
      onUpdate();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to update camp schedule');
    }
  };

  if (isEditing || (!isScheduled && canEdit)) {
    return (
      <div className="w-full flex justify-center">
        <div className="p-6 sm:p-8 max-w-3xl w-full border border-slate-200 shadow-sm rounded-2xl bg-white space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-lg font-bold text-slate-900 tracking-tight">
              {isScheduled ? 'Edit Camp Schedule' : 'Schedule Legal Aid Camp Day'}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Configure the final camp day setup, timing, booths, and guest schedules.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <Input
              label="Camp Day Date *"
              id="camp_date"
              type="date"
              error={errors.camp_date?.message}
              {...register('camp_date')}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Start Time"
                id="start_time"
                type="time"
                error={errors.start_time?.message}
                {...register('start_time')}
              />
              <Input
                label="End Time"
                id="end_time"
                type="time"
                error={errors.end_time?.message}
                {...register('end_time')}
              />
            </div>

            <Input
              label="Camp Venue Location *"
              id="venue"
              placeholder="e.g. Govt Primary School Grounds, Chikkajala"
              error={errors.venue?.message}
              {...register('venue')}
            />

            <div className="space-y-1.5">
              <label htmlFor="camp_notes" className="block text-xs font-bold text-slate-700">
                Camp Setup & Operational Notes
              </label>
              <textarea
                id="camp_notes"
                rows={3}
                placeholder="Stall arrangements, legal counselling desks, chief guest protocol…"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-2xs"
                {...register('camp_notes')}
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              {isScheduled && (
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-500/20 disabled:opacity-50 transition-all cursor-pointer"
              >
                {isSubmitting ? 'Saving…' : isScheduled ? 'Save Schedule' : 'Confirm & Schedule'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  if (!isScheduled) {
    return (
      <div className="w-full flex justify-center">
        <div className="p-8 max-w-xl w-full border border-slate-200 rounded-2xl bg-white text-center space-y-3">
          <Calendar size={32} className="mx-auto text-slate-400" />
          <h3 className="text-base font-bold text-slate-800">Camp Day Phase Not Scheduled</h3>
          <p className="text-xs text-slate-500">
            No camp day schedule has been published for this legal aid project yet.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex justify-center">
      <div className="p-6 sm:p-8 max-w-3xl w-full border border-slate-200 shadow-sm rounded-2xl bg-white space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 block">
              Active Phase Schedule
            </span>
            <h3 className="text-lg font-bold text-slate-900 mt-0.5">Legal Aid Camp Day Timeline</h3>
          </div>
          {canEdit && (
            <Button
              size="sm"
              variant="outline"
              leftIcon={<Edit size={13} />}
              onClick={() => setIsEditing(true)}
              className="border-slate-200 hover:bg-slate-50 font-bold rounded-xl"
            >
              Edit Schedule
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
            <span className="text-slate-500 font-medium flex items-center gap-1.5">
              <Calendar size={14} className="text-indigo-600" /> Camp Day Date
            </span>
            <p className="text-sm font-bold text-slate-900">{formatDate(project.camp_date ?? '')}</p>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
            <span className="text-slate-500 font-medium flex items-center gap-1.5">
              <Clock size={14} className="text-indigo-600" /> Operating Window
            </span>
            <p className="text-sm font-bold text-slate-900">
              {project.start_time || '09:00'} – {project.end_time || '17:00'}
            </p>
          </div>

          <div className="sm:col-span-2 p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
            <span className="text-slate-500 font-medium flex items-center gap-1.5">
              <MapPin size={14} className="text-indigo-600" /> Camp Venue Location
            </span>
            <p className="text-sm font-bold text-slate-900">
              {currentSettings?.venue || project.village_name}
            </p>
          </div>

          {currentSettings?.camp_notes && (
            <div className="sm:col-span-2 p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <span className="text-slate-500 font-medium flex items-center gap-1.5">
                <FileText size={14} className="text-indigo-600" /> Operational Notes
              </span>
              <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                {currentSettings.camp_notes}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
