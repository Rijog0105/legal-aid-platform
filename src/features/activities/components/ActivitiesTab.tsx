import { useState } from 'react';
import { Plus, ListChecks, AlertCircle } from 'lucide-react';
import { Button, EmptyState, Spinner } from '@/components/ui';
import type { Activity } from '@/types';
import { useActivities } from '@/features/activities/hooks/useActivities';
import { deleteActivity } from '@/features/activities/services/activityService';
import { ActivityForm } from './ActivityForm';
import { ActivityListItem } from './ActivityListItem';

interface ActivitiesTabProps {
  campId: string;
}

export function ActivitiesTab({ campId }: ActivitiesTabProps) {
  const { activities, isLoading, error, reload } = useActivities(campId);
  const [showForm, setShowForm] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const openCreate = () => {
    setEditingActivity(null);
    setShowForm(true);
  };

  const openEdit = (activity: Activity) => {
    setEditingActivity(activity);
    setShowForm(true);
  };

  const handleDelete = async (activity: Activity) => {
    if (!window.confirm(`Delete "${activity.activity_name}"? This cannot be undone.`)) return;
    setDeletingId(activity.id);
    setDeleteError(null);
    try {
      await deleteActivity(activity.id);
      reload();
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : 'Failed to delete activity');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-surface-900">
          Activities ({activities.length})
        </h3>
        <Button size="sm" leftIcon={<Plus size={15} />} onClick={openCreate}>
          Add Activity
        </Button>
      </div>

      {(error || deleteError) && (
        <div className="flex items-center gap-2 mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          <AlertCircle size={16} className="flex-shrink-0" />
          {error ?? deleteError}
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : activities.length === 0 ? (
        <div className="bg-white rounded-2xl border border-surface-200 shadow-sm">
          <EmptyState
            icon={<ListChecks size={28} />}
            title="No activities yet"
            description="Add activities to build out this camp's agenda."
            action={
              <Button leftIcon={<Plus size={15} />} onClick={openCreate}>
                Add Activity
              </Button>
            }
          />
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-surface-200 shadow-sm divide-y divide-surface-100">
          {activities.map((activity, index) => (
            <ActivityListItem
              key={activity.id}
              activity={activity}
              index={index}
              onEdit={openEdit}
              onDelete={handleDelete}
              isDeleting={deletingId === activity.id}
            />
          ))}
        </div>
      )}

      {showForm && (
        <ActivityForm
          campId={campId}
          activity={editingActivity}
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            reload();
          }}
        />
      )}
    </div>
  );
}
