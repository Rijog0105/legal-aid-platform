import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Card, Input } from '@/components/ui';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { ROLES } from '@/constants';
import type { Project } from '@/types';
import { updateProject } from '@/features/projects/services/projectService';
import { Calendar, Clock, Edit, FileText } from 'lucide-react';
import { formatDate } from '@/utils';

const schema = z.object({
  survey_date: z.string().min(1, 'Survey date is required'),
  survey_start_time: z.string().optional(),
  survey_end_time: z.string().optional(),
  survey_notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface SurveyScheduleProps {
  project: Project;
  onUpdate: () => void;
}

export function SurveySchedule({ project, onUpdate }: SurveyScheduleProps) {
  const { hasRole } = useAuth();
  const canEdit = hasRole([ROLES.FACULTY, ROLES.ADMIN]);
  const [isEditing, setIsEditing] = useState(false);

  const currentSettings = project.report_settings;
  const hasSchedule = !!currentSettings?.survey_date;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      survey_date: currentSettings?.survey_date ?? '',
      survey_start_time: currentSettings?.survey_start_time ?? '',
      survey_end_time: currentSettings?.survey_end_time ?? '',
      survey_notes: currentSettings?.survey_notes ?? '',
    },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      await updateProject(project.id, {
        report_settings: {
          ...currentSettings,
          survey_date: values.survey_date,
          survey_start_time: values.survey_start_time || undefined,
          survey_end_time: values.survey_end_time || undefined,
          survey_notes: values.survey_notes || undefined,
        },
      });
      setIsEditing(false);
      onUpdate();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to update survey schedule');
    }
  };

  if (isEditing || (!hasSchedule && canEdit)) {
    return (
      <Card className="p-6 max-w-xl mx-auto space-y-4">
        <div className="border-b border-surface-100 pb-2">
          <h3 className="text-base font-bold text-surface-900">
            {hasSchedule ? 'Edit Survey Schedule' : 'Schedule Survey Phase'}
          </h3>
          <p className="text-xs text-surface-500 mt-0.5">
            Configure the schedule details for community need assessment survey phase.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Survey Date *"
            id="survey_date"
            type="date"
            error={errors.survey_date?.message}
            {...register('survey_date')}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Start Time"
              id="survey_start_time"
              type="time"
              error={errors.survey_start_time?.message}
              {...register('survey_start_time')}
            />
            <Input
              label="End Time"
              id="survey_end_time"
              type="time"
              error={errors.survey_end_time?.message}
              {...register('survey_end_time')}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="survey_notes" className="text-sm font-medium text-surface-700">
              Survey Field Instructions / Notes
            </label>
            <textarea
              id="survey_notes"
              rows={3}
              placeholder="e.g. Meet at the legal clinic for registration check-in before survey deployment…"
              className="w-full px-4 py-2.5 rounded-xl border text-sm bg-white text-surface-900 border-surface-300 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all"
              {...register('survey_notes')}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            {hasSchedule && (
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

  if (!hasSchedule) {
    return (
      <Card className="p-8 text-center space-y-3 max-w-xl mx-auto border-dashed">
        <Calendar className="w-12 h-12 text-surface-400 mx-auto" />
        <h3 className="text-base font-bold text-surface-800">No Survey Scheduled</h3>
        <p className="text-xs text-surface-500">
          Faculty has not configured the schedule for the survey phase yet.
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-6 max-w-xl mx-auto space-y-5">
      <div className="flex items-center justify-between border-b border-surface-100 pb-3">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary-600" />
          <h3 className="text-base font-bold text-surface-900">Survey Schedule</h3>
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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
        <div className="bg-surface-50 p-3 rounded-xl border border-surface-100">
          <span className="text-xs text-surface-400 block mb-0.5">Date</span>
          <span className="font-semibold text-surface-800">{formatDate(currentSettings.survey_date!)}</span>
        </div>
        <div className="bg-surface-50 p-3 rounded-xl border border-surface-100">
          <span className="text-xs text-surface-400 block mb-0.5">Hours</span>
          <span className="font-semibold text-surface-800 flex items-center gap-1">
            <Clock size={12} className="text-surface-400" />
            {currentSettings.survey_start_time ?? '—'} – {currentSettings.survey_end_time ?? '—'}
          </span>
        </div>
      </div>

      {currentSettings.survey_notes && (
        <div className="bg-surface-50 p-4 rounded-xl border border-surface-100 text-xs">
          <span className="font-bold text-surface-800 flex items-center gap-1.5 mb-1.5">
            <FileText size={13} className="text-primary-600" /> Field Instructions / Notes
          </span>
          <p className="text-surface-600 leading-relaxed whitespace-pre-wrap">{currentSettings.survey_notes}</p>
        </div>
      )}
    </Card>
  );
}
