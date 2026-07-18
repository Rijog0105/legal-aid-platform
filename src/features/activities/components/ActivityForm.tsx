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

const schema = z.object({
  activity_name: z.string().min(2, 'Activity name must be at least 2 characters'),
});

type FormValues = z.infer<typeof schema>;

interface ActivityFormProps {
  campId: string;
  activity?: Activity | null;
  onClose: () => void;
  onSaved: (activity: Activity) => void;
}

export function ActivityForm({ campId, activity, onClose, onSaved }: ActivityFormProps) {
  const isEdit = !!activity;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      activity_name: '',
    },
  });

  useEffect(() => {
    if (activity) {
      reset({ activity_name: activity.activity_name });
    }
  }, [activity, reset]);

  const onSubmit = async (values: FormValues) => {
    const saved = isEdit
      ? await updateActivity(activity.id, { activity_name: values.activity_name })
      : await createActivity({
          camp_id: campId,
          activity_name: values.activity_name,
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
            <Input
              label="Activity Name *"
              id="activity_name"
              list="predefined-activities"
              placeholder="Inauguration, Welcome Address…"
              error={errors.activity_name?.message}
              {...register('activity_name')}
            />
            <datalist id="predefined-activities">
              {PREDEFINED_ACTIVITIES.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>

            {!isEdit && (
              <div className="flex flex-wrap gap-2">
                {PREDEFINED_ACTIVITIES.slice(0, 6).map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() =>
                      reset({ activity_name: name }, { keepDefaultValues: true })
                    }
                    className="px-3 py-1.5 rounded-full text-xs font-medium border border-surface-300 text-surface-600 hover:bg-surface-100 transition-colors"
                  >
                    {name}
                  </button>
                ))}
              </div>
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
