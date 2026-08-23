import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Pencil, Trash2 } from 'lucide-react';
import { ActivityStatusBadge } from '@/components/ui';
import type { Activity, Project } from '@/types';
import { deriveActivityStatus } from '@/utils/projectLifecycle';

interface ActivityListItemProps {
  activity: Activity;
  project: Project;
  index: number;
  onEdit: (activity: Activity) => void;
  onDelete: (activity: Activity) => void;
  isDeleting?: boolean;
}

export function ActivityListItem({
  activity,
  project,
  index,
  onEdit,
  onDelete,
  isDeleting = false,
}: ActivityListItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: activity.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Derive status dynamically based on project phase dates
  const derivedStatus = deriveActivityStatus(activity, project);

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

      {/* Read-only status badge showing dynamically derived status */}
      <ActivityStatusBadge status={derivedStatus} />

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
