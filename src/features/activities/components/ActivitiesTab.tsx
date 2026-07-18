import { useState } from 'react';
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus, ListChecks, AlertCircle } from 'lucide-react';
import { Button, EmptyState, Spinner } from '@/components/ui';
import type { Activity } from '@/types';
import type { ActivityStatus } from '@/constants';
import { useActivities } from '@/features/activities/hooks/useActivities';
import {
  deleteActivity,
  reorderActivities,
  updateActivityStatus,
} from '@/features/activities/services/activityService';
import { ActivityForm } from './ActivityForm';
import { ActivityListItem } from './ActivityListItem';

interface ActivitiesTabProps {
  campId: string;
}

export function ActivitiesTab({ campId }: ActivitiesTabProps) {
  const { activities, isLoading, error, reload, setActivities } = useActivities(campId);
  const [showForm, setShowForm] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

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
    setActionError(null);
    try {
      await deleteActivity(activity.id);
      reload();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Failed to delete activity');
    } finally {
      setDeletingId(null);
    }
  };

  const handleStatusChange = async (activity: Activity, status: ActivityStatus) => {
    setStatusUpdatingId(activity.id);
    setActionError(null);
    try {
      const updated = await updateActivityStatus(activity.id, status);
      setActivities((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Failed to update activity status');
    } finally {
      setStatusUpdatingId(null);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = activities.findIndex((a) => a.id === active.id);
    const newIndex = activities.findIndex((a) => a.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(activities, oldIndex, newIndex);
    setActivities(reordered);
    setActionError(null);

    try {
      await reorderActivities(
        campId,
        reordered.map((a) => a.id)
      );
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Failed to save new order');
      reload();
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

      {(error || actionError) && (
        <div className="flex items-center gap-2 mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          <AlertCircle size={16} className="flex-shrink-0" />
          {error ?? actionError}
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
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext
            items={activities.map((a) => a.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="bg-white rounded-2xl border border-surface-200 shadow-sm divide-y divide-surface-100">
              {activities.map((activity, index) => (
                <ActivityListItem
                  key={activity.id}
                  activity={activity}
                  index={index}
                  onEdit={openEdit}
                  onDelete={handleDelete}
                  onStatusChange={handleStatusChange}
                  isDeleting={deletingId === activity.id}
                  isStatusUpdating={statusUpdatingId === activity.id}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
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
