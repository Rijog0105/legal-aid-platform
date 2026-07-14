import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Input } from '@/components/ui';
import { APP_CONFIG } from '@/constants';
import type { Camp } from '@/types';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { createCamp, updateCamp } from '@/features/camps/services/campService';

const schema = z.object({
  camp_name: z.string().min(2, 'Camp name must be at least 2 characters'),
  description: z.string().optional(),
  camp_date: z.string().min(1, 'Camp date is required'),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  village_name: z.string().min(1, 'Village is required'),
  taluk: z.string().min(1, 'Taluk is required'),
  district: z.string().min(1, 'District is required'),
  include_budget: z.boolean(),
  include_survey_stats: z.boolean(),
  max_photos_per_activity: z.number().int().min(1, 'Must be at least 1'),
});

type FormValues = z.infer<typeof schema>;

interface CampFormProps {
  camp?: Camp | null;
  onCancel: () => void;
  onSaved: (camp: Camp) => void;
}

export function CampForm({ camp, onCancel, onSaved }: CampFormProps) {
  const isEdit = !!camp;
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
      camp_date: '',
      start_time: '',
      end_time: '',
      village_name: '',
      taluk: '',
      district: '',
      include_budget: true,
      include_survey_stats: true,
      max_photos_per_activity: APP_CONFIG.DEFAULT_MAX_PHOTOS_PER_ACTIVITY,
    },
  });

  useEffect(() => {
    if (camp) {
      reset({
        camp_name: camp.camp_name,
        description: camp.description ?? '',
        camp_date: camp.camp_date,
        start_time: camp.start_time ?? '',
        end_time: camp.end_time ?? '',
        village_name: camp.village_name,
        taluk: camp.taluk,
        district: camp.district,
        include_budget: camp.report_settings?.include_budget ?? true,
        include_survey_stats: camp.report_settings?.include_survey_stats ?? true,
        max_photos_per_activity:
          camp.report_settings?.max_photos_per_activity ??
          APP_CONFIG.DEFAULT_MAX_PHOTOS_PER_ACTIVITY,
      });
    }
  }, [camp, reset]);

  const onSubmit = async (values: FormValues) => {
    const payload = {
      camp_name: values.camp_name,
      description: values.description || null,
      camp_date: values.camp_date,
      start_time: values.start_time || null,
      end_time: values.end_time || null,
      village_name: values.village_name,
      taluk: values.taluk,
      district: values.district,
      report_settings: {
        include_budget: values.include_budget,
        include_survey_stats: values.include_survey_stats,
        max_photos_per_activity: values.max_photos_per_activity,
      },
    };

    const saved =
      isEdit && camp
        ? await updateCamp(camp.id, payload)
        : await createCamp({ ...payload, created_by: userId ?? '' });
    onSaved(saved);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="space-y-5">
        <Input
          label="Camp Name *"
          id="camp_name"
          placeholder="Rural Legal Awareness Camp"
          error={errors.camp_name?.message}
          {...register('camp_name')}
        />

        <div className="flex flex-col gap-1.5">
          <label htmlFor="description" className="text-sm font-medium text-surface-700">
            Description
          </label>
          <textarea
            id="description"
            rows={3}
            placeholder="Brief description of the camp…"
            className="w-full px-4 py-2.5 rounded-xl border text-sm bg-white text-surface-900 border-surface-300 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all"
            {...register('description')}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input
            label="Camp Date *"
            id="camp_date"
            type="date"
            error={errors.camp_date?.message}
            {...register('camp_date')}
          />
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

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input
            label="Village *"
            id="village_name"
            placeholder="Village name"
            error={errors.village_name?.message}
            {...register('village_name')}
          />
          <Input
            label="Taluk *"
            id="taluk"
            placeholder="Taluk"
            error={errors.taluk?.message}
            {...register('taluk')}
          />
          <Input
            label="District *"
            id="district"
            placeholder="District"
            error={errors.district?.message}
            {...register('district')}
          />
        </div>

        <div className="border-t border-surface-200 pt-5">
          <p className="text-sm font-medium text-surface-700 mb-3">Report Settings</p>
          <div className="flex flex-col sm:flex-row gap-4 sm:items-center">
            <label className="flex items-center gap-2 text-sm text-surface-700">
              <input type="checkbox" className="rounded" {...register('include_budget')} />
              Include Budget
            </label>
            <label className="flex items-center gap-2 text-sm text-surface-700">
              <input type="checkbox" className="rounded" {...register('include_survey_stats')} />
              Include Survey Stats
            </label>
            <div className="w-full sm:w-48">
              <Input
                label="Max Photos / Activity"
                id="max_photos_per_activity"
                type="number"
                min={1}
                error={errors.max_photos_per_activity?.message}
                {...register('max_photos_per_activity', { valueAsNumber: true })}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 pt-6 mt-6 border-t border-surface-200">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" isLoading={isSubmitting}>
          {isEdit ? 'Save Changes' : 'Create Camp'}
        </Button>
      </div>
    </form>
  );
}
