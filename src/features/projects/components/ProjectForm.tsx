import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '@/components/ui';
import { APP_CONFIG } from '@/constants';
import type { Project } from '@/types';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { createProject, updateProject } from '@/features/projects/services/projectService';

const schema = z.object({
  camp_name: z.string().min(2, 'Project name must be at least 2 characters'),
  description: z.string().optional(),
  village_name: z.string().min(1, 'Village is required'),
  taluk: z.string().min(1, 'Taluk is required'),
  district: z.string().min(1, 'District is required'),
  state: z.string().min(1, 'State is required'),
  academic_year: z.string().optional(),
  max_photos_per_activity: z.number().int().min(1, 'Must be at least 1'),
});

type FormValues = z.infer<typeof schema>;

interface ProjectFormProps {
  project?: Project | null;
  onCancel: () => void;
  onSaved: (project: Project) => void;
}

export function ProjectForm({ project, onCancel, onSaved }: ProjectFormProps) {
  const isEdit = !!project;
  const { userId } = useAuth();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues, undefined, FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      camp_name: '',
      description: '',
      village_name: '',
      taluk: '',
      district: '',
      state: 'Karnataka',
      academic_year: '2026-27',
      max_photos_per_activity: APP_CONFIG.DEFAULT_MAX_PHOTOS_PER_ACTIVITY,
    },
  });

  useEffect(() => {
    if (project) {
      reset({
        camp_name: project.camp_name,
        description: project.description ?? '',
        village_name: project.village_name,
        taluk: project.taluk,
        district: project.district,
        state: project.report_settings?.state ?? 'Karnataka',
        academic_year: project.report_settings?.academic_year ?? '2026-27',
        max_photos_per_activity:
          project.report_settings?.max_photos_per_activity ??
          APP_CONFIG.DEFAULT_MAX_PHOTOS_PER_ACTIVITY,
      });
    }
  }, [project, reset]);

  const onSubmit = async (values: FormValues) => {
    const payload = {
      camp_name: values.camp_name.trim(),
      description: values.description?.trim() || null,
      camp_date: project?.camp_date || new Date().toISOString().split('T')[0],
      start_time: project?.start_time || null,
      end_time: project?.end_time || null,
      village_name: values.village_name.trim(),
      taluk: values.taluk.trim(),
      district: values.district.trim(),
      report_settings: {
        include_budget: true,
        include_survey_stats: true,
        max_photos_per_activity: values.max_photos_per_activity,
        survey_date: project?.report_settings?.survey_date,
        survey_start_time: project?.report_settings?.survey_start_time,
        survey_end_time: project?.report_settings?.survey_end_time,
        survey_notes: project?.report_settings?.survey_notes,
        camp_notes: project?.report_settings?.camp_notes,
        state: values.state.trim(),
        academic_year: values.academic_year?.trim() || undefined,
      },
    };

    const saved =
      isEdit && project
        ? await updateProject(project.id, payload)
        : await createProject({ ...payload, created_by: userId ?? '' });
    onSaved(saved);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
      <div className="space-y-5">
        {/* Project Name */}
        <Input
          label="Project Title *"
          id="camp_name"
          placeholder="e.g. Chikkajala Rural Legal Literacy & Aid Project"
          error={errors.camp_name?.message}
          {...register('camp_name')}
        />

        {/* Project Description */}
        <div className="space-y-1.5">
          <label htmlFor="description" className="block text-xs font-bold text-slate-700">
            Project Description / Objectives
          </label>
          <textarea
            id="description"
            rows={3}
            placeholder="Briefly state target community, socio-legal objectives, and scope…"
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-2xs"
            {...register('description')}
          />
        </div>

        {/* Location Row 1: Village & Taluk */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Target Village / Ward *"
            id="village_name"
            placeholder="e.g. Chikkajala"
            error={errors.village_name?.message}
            {...register('village_name')}
          />
          <Input
            label="Taluk *"
            id="taluk"
            placeholder="e.g. Bangalore North"
            error={errors.taluk?.message}
            {...register('taluk')}
          />
        </div>

        {/* Location Row 2: District, State, Academic Year */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input
            label="District *"
            id="district"
            placeholder="e.g. Bangalore Rural"
            error={errors.district?.message}
            {...register('district')}
          />
          <Input
            label="State *"
            id="state"
            placeholder="e.g. Karnataka"
            error={errors.state?.message}
            {...register('state')}
          />
          <Input
            label="Academic Year"
            id="academic_year"
            placeholder="e.g. 2026-27"
            error={errors.academic_year?.message}
            {...register('academic_year')}
          />
        </div>

        {/* Configuration */}
        <div className="border-t border-slate-100 pt-5 space-y-3">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Report Documentation Settings</span>
          <div className="w-full sm:w-56">
            <Input
              label="Max Photos Per Activity"
              id="max_photos_per_activity"
              type="number"
              min={1}
              error={errors.max_photos_per_activity?.message}
              {...register('max_photos_per_activity', { valueAsNumber: true })}
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2.5 pt-5 border-t border-slate-100">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-xs shadow-md shadow-indigo-500/20 disabled:opacity-50 transition-all cursor-pointer"
        >
          {isSubmitting ? (
            <>
              <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              <span>Saving…</span>
            </>
          ) : (
            <span>{isEdit ? 'Update Project' : 'Create Project'}</span>
          )}
        </button>
      </div>
    </form>
  );
}
