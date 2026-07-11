import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      {icon && (
        <div className="w-16 h-16 rounded-2xl bg-surface-100 flex items-center justify-center mb-4 text-surface-400">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold text-surface-800 mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-surface-500 max-w-sm mb-6">{description}</p>
      )}
      {action}
    </div>
  );
}
