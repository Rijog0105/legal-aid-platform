import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { X } from 'lucide-react';
import { Button, Input } from '@/components/ui';
import { PREDEFINED_ACTIVITIES } from '@/constants';
import type { Activity } from '@/types';
import {
  createActivity,
  updateActivity,
  getNextActivityOrder,
} from '@/features/activities/services/activityService';

const OTHER_ACTIVITY_VALUE = '__other__';

const schema = z
  .object({
    template: z.string().min(1, 'Select an activity'),
    custom_name: z.string().optional(),
  })
  .refine(
    (data) =>
      data.template !== OTHER_ACTIVITY_VALUE || (data.custom_name?.trim().length ?? 0) >= 2,
    {
      message: 'Custom activity name must be at least 2 characters',
      path: ['custom_name'],
    }
  );

type FormValues = z.infer<typeof schema>;

interface ActivityFormProps {
  campId: string;
  activity?: Activity | null;
  onClose: () => void;
  onSaved: (activity: Activity) => void;
}

function isPredefined(name: string): boolean {
  return (PREDEFINED_ACTIVITIES as readonly string[]).includes(name);
}

export function ActivityForm({ campId, activity, onClose, onSaved }: ActivityFormProps) {
  const isEdit = !!activity;

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      template: '',
      custom_name: '',
    },
  });

  useEffect(() => {
    if (activity) {
      if (isPredefined(activity.activity_name)) {
        reset({ template: activity.activity_name, custom_name: '' });
      } else {
        reset({ template: OTHER_ACTIVITY_VALUE, custom_name: activity.activity_name });
      }
    }
  }, [activity, reset]);

  const template = watch('template');
  const showCustomInput = template === OTHER_ACTIVITY_VALUE;

  const onSubmit = async (values: FormValues) => {
    const activity_name =
      values.template === OTHER_ACTIVITY_VALUE ? values.custom_name!.trim() : values.template;

    const saved = isEdit
      ? await updateActivity(activity.id, { activity_name })
      : await createActivity({
          camp_id: campId,
          activity_name,
          activity_order: await getNextActivityOrder(campId),
        });
    onSaved(saved);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-200">
          <h2 className="text-lg font-semibold text-surface-900">
            {isEdit ? 'Edit Activity' : 'Add Activity'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-surface-400 hover:bg-surface-100 hover:text-surface-700 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="px-6 py-5 space-y-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="template" className="text-sm font-medium text-surface-700">
                Activity *
              </label>
              <select
                id="template"
                {...register('template')}
                className={`w-full px-4 py-2.5 rounded-xl border text-sm bg-white text-surface-900 border-surface-300 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all duration-200 ${
                  errors.template ? 'border-red-500' : ''
                }`}
              >
                <option value="" disabled>
                  Select an activity…
                </option>
                {PREDEFINED_ACTIVITIES.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
                <option value={OTHER_ACTIVITY_VALUE}>Other / Custom Activity</option>
              </select>
              {errors.template && (
                <p className="text-xs text-red-600 mt-0.5">{errors.template.message}</p>
              )}
            </div>

            {showCustomInput && (
              <Input
                label="Custom Activity Name *"
                id="custom_name"
                placeholder="Enter a custom activity name"
                error={errors.custom_name?.message}
                {...register('custom_name')}
              />
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-surface-200 bg-surface-50">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              {isEdit ? 'Save Changes' : 'Add Activity'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
