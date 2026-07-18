import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Pencil, Trash2 } from 'lucide-react';
import { ActivityStatusBadge, Button } from '@/components/ui';
import { ACTIVITY_STATUS, type ActivityStatus } from '@/constants';
import type { Activity } from '@/types';

const STATUS_FLOW: Record<ActivityStatus, ActivityStatus[]> = {
  [ACTIVITY_STATUS.PLANNED]: [ACTIVITY_STATUS.ACTIVE],
  [ACTIVITY_STATUS.ACTIVE]: [ACTIVITY_STATUS.COMPLETED],
  [ACTIVITY_STATUS.COMPLETED]: [],
};

const STATUS_LABELS: Record<ActivityStatus, string> = {
  [ACTIVITY_STATUS.PLANNED]: 'Planned',
  [ACTIVITY_STATUS.ACTIVE]: 'Active',
  [ACTIVITY_STATUS.COMPLETED]: 'Completed',
};

interface ActivityListItemProps {
  activity: Activity;
  index: number;
  onEdit: (activity: Activity) => void;
  onDelete: (activity: Activity) => void;
  onStatusChange: (activity: Activity, status: ActivityStatus) => void;
  isDeleting?: boolean;
  isStatusUpdating?: boolean;
}

export function ActivityListItem({
  activity,
  index,
  onEdit,
  onDelete,
  onStatusChange,
  isDeleting = false,
  isStatusUpdating = false,
}: ActivityListItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: activity.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const nextStatuses = STATUS_FLOW[activity.status];

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 px-5 py-4 hover:bg-surface-50/60 transition-colors group ${
        isDragging ? 'relative z-10 bg-surface-50 opacity-70' : ''
      }`}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        title="Drag to reorder"
        className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded text-surface-300 hover:text-surface-500 cursor-grab active:cursor-grabbing touch-none"
      >
        <GripVertical size={16} />
      </button>

      <span className="flex-shrink-0 w-7 h-7 rounded-full bg-surface-100 text-surface-600 text-xs font-semibold flex items-center justify-center">
        {index + 1}
      </span>

      <span className="flex-1 font-medium text-surface-900 truncate">
        {activity.activity_name}
      </span>

      <ActivityStatusBadge status={activity.status} />

      {nextStatuses.length > 0 && (
        <Button
          size="sm"
          variant="secondary"
          isLoading={isStatusUpdating}
          onClick={() => onStatusChange(activity, nextStatuses[0])}
        >
          Mark {STATUS_LABELS[nextStatuses[0]]}
        </Button>
      )}

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => onEdit(activity)}
          title="Edit"
          className="w-8 h-8 flex items-center justify-center rounded-lg text-surface-400 hover:bg-surface-100 hover:text-surface-700 transition-colors"
        >
          <Pencil size={15} />
        </button>
        <button
          onClick={() => onDelete(activity)}
          disabled={isDeleting}
          title="Delete"
          className="w-8 h-8 flex items-center justify-center rounded-lg text-surface-400 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-40"
        >
          {isDeleting ? (
            <span className="w-3.5 h-3.5 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
          ) : (
            <Trash2 size={15} />
          )}
        </button>
      </div>
    </div>
  );
}
