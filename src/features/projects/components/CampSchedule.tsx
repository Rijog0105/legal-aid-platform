import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Card, Input } from '@/components/ui';
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
        village_name: values.venue, // Reuses village_name or stores specific venue
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
      <Card className="p-6 max-w-xl mx-auto space-y-4">
        <div className="border-b border-surface-100 pb-2">
          <h3 className="text-base font-bold text-surface-900">
            {isScheduled ? 'Edit Camp Schedule' : 'Schedule Camp Phase'}
          </h3>
          <p className="text-xs text-surface-500 mt-0.5">
            Configure the final camp day setup, timing, booths, and guest schedules.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Camp Date *"
            id="camp_date"
            type="date"
            error={errors.camp_date?.message}
            {...register('camp_date')}
          />

          <div className="grid grid-cols-2 gap-4">
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
            label="Venue / Location *"
            id="venue"
            placeholder="e.g. Gram Panchayat Hall / Primary School Compound"
            error={errors.venue?.message}
            {...register('venue')}
          />

          <div className="flex flex-col gap-1.5">
            <label htmlFor="camp_notes" className="text-sm font-medium text-surface-700">
              Camp Logistics / Notes
            </label>
            <textarea
              id="camp_notes"
              rows={3}
              placeholder="e.g. Set up Booth 1-4 for legal advice. Roster verification starts at 8:30 AM…"
              className="w-full px-4 py-2.5 rounded-xl border text-sm bg-white text-surface-900 border-surface-300 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all"
              {...register('camp_notes')}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            {isScheduled && (
              <Button type="button" variant="secondary" size="sm" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
            )}
            <Button type="submit" size="sm" isLoading={isSubmitting}>
              Save Schedule
            </Button>
          </div>
        </form>
      </Card>
    );
  }

  if (!isScheduled) {
    return (
      <Card className="p-8 text-center space-y-3 max-w-xl mx-auto border-dashed">
        <Calendar className="w-12 h-12 text-surface-400 mx-auto" />
        <h3 className="text-base font-bold text-surface-800">No Camp Scheduled</h3>
        <p className="text-xs text-surface-500">
          Faculty has not configured the schedule for the main camp phase yet.
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-6 max-w-xl mx-auto space-y-5">
      <div className="flex items-center justify-between border-b border-surface-100 pb-3">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-emerald-600" />
          <h3 className="text-base font-bold text-surface-900">Camp Schedule</h3>
        </div>
        {canEdit && (
          <Button
            size="sm"
            variant="outline"
            leftIcon={<Edit size={13} />}
            onClick={() => setIsEditing(true)}
          >
            Edit Schedule
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
        <div className="bg-surface-50 p-3 rounded-xl border border-surface-100">
          <span className="text-xs text-surface-400 block mb-0.5">Date</span>
          <span className="font-semibold text-surface-800">{formatDate(project.camp_date)}</span>
        </div>
        <div className="bg-surface-50 p-3 rounded-xl border border-surface-100">
          <span className="text-xs text-surface-400 block mb-0.5">Hours</span>
          <span className="font-semibold text-surface-800 flex items-center gap-1">
            <Clock size={12} className="text-surface-400" />
            {project.start_time ?? '—'} – {project.end_time ?? '—'}
          </span>
        </div>
        <div className="bg-surface-50 p-3 rounded-xl border border-surface-100">
          <span className="text-xs text-surface-400 block mb-0.5">Venue</span>
          <span className="font-semibold text-surface-800 flex items-center gap-1">
            <MapPin size={12} className="text-surface-400" />
            {currentSettings.venue ?? project.village_name}
          </span>
        </div>
      </div>

      {currentSettings.camp_notes && (
        <div className="bg-surface-50 p-4 rounded-xl border border-surface-100 text-xs">
          <span className="font-bold text-surface-800 flex items-center gap-1.5 mb-1.5">
            <FileText size={13} className="text-emerald-600" /> Logistics & Notes
          </span>
          <p className="text-surface-600 leading-relaxed whitespace-pre-wrap">{currentSettings.camp_notes}</p>
        </div>
      )}
    </Card>
  );
}
