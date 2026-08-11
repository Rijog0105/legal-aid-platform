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
  survey_date: z.string().min(1, 'Survey date is required'),
  survey_start_time: z.string().optional(),
  survey_end_time: z.string().optional(),
  survey_location: z.string().min(1, 'Survey location is required'),
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
  const isScheduled = !!currentSettings?.survey_date;

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
      survey_location: currentSettings?.survey_location ?? project.village_name ?? '',
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
          survey_location: values.survey_location,
          survey_notes: values.survey_notes || undefined,
        },
      });
      setIsEditing(false);
      onUpdate();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to update survey schedule');
    }
  };

  if (isEditing || (!isScheduled && canEdit)) {
    return (
      <Card 
        className="p-8 max-w-3xl lg:max-w-4xl w-full border border-surface-200/80 shadow-md shadow-surface-900/4 rounded-3xl bg-white" 
        padding="lg"
      >
        <div className="border-b border-surface-100 pb-4 mb-6">
          <h3 className="text-lg font-bold text-surface-900 tracking-tight">
            {isScheduled ? 'Edit Survey Schedule' : 'Schedule Survey Phase'}
          </h3>
          <p className="text-xs text-surface-500 mt-1">
            Configure the schedule details for community need assessment survey phase.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <Input
            label="Survey Date *"
            id="survey_date"
            type="date"
            error={errors.survey_date?.message}
            {...register('survey_date')}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
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

          <Input
            label="Survey Location *"
            id="survey_location"
            placeholder="e.g. Village ward offices / Community centers"
            error={errors.survey_location?.message}
            {...register('survey_location')}
          />

          <div className="flex flex-col gap-1.5">
            <label htmlFor="survey_notes" className="text-sm font-medium text-surface-700">
              Survey Field Instructions / Notes
            </label>
            <textarea
              id="survey_notes"
              rows={5}
              placeholder="e.g. Meet at the legal clinic for registration check-in before survey deployment…"
              className="w-full px-4 py-3 rounded-2xl border text-sm bg-white text-surface-900 border-surface-300 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 hover:border-surface-400 transition-all min-h-[120px] resize-y"
              {...register('survey_notes')}
            />
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-surface-100 mt-6">
            {isScheduled && (
              <Button 
                type="button" 
                variant="secondary" 
                size="md" 
                onClick={() => setIsEditing(false)}
                className="px-5 py-2.5 rounded-xl text-sm font-medium transition-all"
              >
                Cancel
              </Button>
            )}
            <Button 
              type="submit" 
              size="md" 
              isLoading={isSubmitting}
              className="px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-medium transition-all hover:scale-[1.01]"
            >
              Save Schedule
            </Button>
          </div>
        </form>
      </Card>
    );
  }

  if (!isScheduled) {
    return (
      <Card 
        className="p-10 text-center space-y-4 max-w-3xl lg:max-w-4xl w-full border border-dashed border-surface-300 rounded-3xl bg-white" 
        padding="lg"
      >
        <Calendar className="w-12 h-12 text-surface-400 mx-auto" />
        <h3 className="text-base font-bold text-surface-800">No Survey Scheduled</h3>
        <p className="text-xs text-surface-500 max-w-md mx-auto leading-relaxed">
          Faculty has not configured the schedule for the survey phase yet.
        </p>
      </Card>
    );
  }

  return (
    <Card 
      className="p-8 max-w-3xl lg:max-w-4xl w-full border border-surface-200/80 shadow-md shadow-surface-900/4 rounded-3xl bg-white" 
      padding="lg"
    >
      <div className="flex items-center justify-between border-b border-surface-100 pb-4 mb-6">
        <div className="flex items-center gap-2.5">
          <Calendar className="w-5 h-5 text-indigo-600" />
          <h3 className="text-lg font-bold text-surface-900 tracking-tight">Survey Schedule</h3>
        </div>
        {canEdit && (
          <Button
            size="sm"
            variant="outline"
            leftIcon={<Edit size={13} />}
            onClick={() => setIsEditing(true)}
            className="px-4 py-2 rounded-xl text-xs font-semibold border-surface-300 text-surface-700 hover:bg-slate-50 transition-all shadow-xs flex items-center gap-1.5"
          >
            Edit Schedule
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-sm mb-6">
        <div className="bg-surface-50/50 p-4 rounded-2xl border border-surface-100 transition-all hover:bg-surface-50">
          <span className="text-[11px] font-bold text-surface-400 block uppercase tracking-wider mb-1">Date</span>
          <span className="font-semibold text-surface-800 text-sm">{formatDate(currentSettings.survey_date!)}</span>
        </div>
        <div className="bg-surface-50/50 p-4 rounded-2xl border border-surface-100 transition-all hover:bg-surface-50">
          <span className="text-[11px] font-bold text-surface-400 block uppercase tracking-wider mb-1">Hours</span>
          <span className="font-semibold text-surface-800 text-sm flex items-center gap-1.5">
            <Clock size={14} className="text-surface-400 shrink-0" />
            {currentSettings.survey_start_time ?? '—'} – {currentSettings.survey_end_time ?? '—'}
          </span>
        </div>
        <div className="bg-surface-50/50 p-4 rounded-2xl border border-surface-100 transition-all hover:bg-surface-50">
          <span className="text-[11px] font-bold text-surface-400 block uppercase tracking-wider mb-1">Location</span>
          <span className="font-semibold text-surface-800 text-sm flex items-center gap-1.5 leading-snug">
            <MapPin size={14} className="text-surface-400 shrink-0" />
            {currentSettings.survey_location ?? project.village_name}
          </span>
        </div>
      </div>

      {currentSettings.survey_notes && (
        <div className="bg-surface-50/30 p-5 rounded-2xl border border-surface-100 text-xs">
          <span className="font-bold text-surface-800 flex items-center gap-2 mb-2 text-sm">
            <FileText size={15} className="text-indigo-600" /> Instructions & Notes
          </span>
          <p className="text-surface-600 leading-relaxed whitespace-pre-wrap text-sm">{currentSettings.survey_notes}</p>
        </div>
      )}
    </Card>
  );
}
