import { useEffect } from 'react';
import { useActivities } from '@/features/activities/hooks/useActivities';
import { ACTIVITY_STATUS } from '@/constants';
import { Spinner } from '@/components/ui';
import type { Activity } from '@/types';

interface ActivitySelectorProps {
  campId: string;
  selectedActivityId: string | null;
  onSelect: (activity: Activity) => void;
  /** Filter activities by phase — only show survey or camp activities as appropriate. */
  phase?: 'survey' | 'camp';
  disabled?: boolean;
}

/**
 * Reuses the existing `useActivities` hook from the Activities feature
 * (Phase 5) directly, rather than duplicating activity-fetching logic here.
 */
export function ActivitySelector({
  campId,
  selectedActivityId,
  onSelect,
  phase,
  disabled,
}: ActivitySelectorProps) {
  const { activities, isLoading, error } = useActivities(campId, phase);

  // Auto-select survey activity during survey phase
  useEffect(() => {
    if (phase === 'survey' && activities.length > 0) {
      const surveyAct = activities.find((a) => a.phase === 'survey') || activities[0];
      if (surveyAct && selectedActivityId !== surveyAct.id) {
        onSelect(surveyAct);
      }
    }
  }, [phase, activities, selectedActivityId, onSelect]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-6">
        <Spinner size="sm" />
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  if (activities.length === 0) {
    return (
      <p className="text-sm text-surface-500">
        No activities have been added to this project yet. Ask faculty to add one before capturing photos.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor="activity-selector" className="text-sm font-medium text-surface-700">
        Activity
      </label>
      <select
        id="activity-selector"
        value={selectedActivityId ?? ''}
        disabled={disabled}
        onChange={(e) => {
          const activity = activities.find((a) => a.id === e.target.value);
          if (activity) onSelect(activity);
        }}
        className="w-full px-4 py-2.5 rounded-xl border text-sm bg-white text-surface-900 border-surface-300 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all disabled:bg-surface-50 disabled:text-surface-500 disabled:cursor-not-allowed"
      >
        <option value="" disabled>
          Select an activity…
        </option>
        {activities.map((activity) => (
          <option key={activity.id} value={activity.id}>
            {activity.activity_name}
            {activity.status === ACTIVITY_STATUS.COMPLETED ? ' (completed)' : ''}
          </option>
        ))}
      </select>
    </div>
  );
}
