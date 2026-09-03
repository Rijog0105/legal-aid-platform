import type { ProjectStatus, ActivityStatus, ReportStatus } from '@/constants';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'primary';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
  dot?: boolean;
}

const variantClasses: Record<BadgeVariant, { container: string; dot: string }> = {
  default: {
    container: 'bg-slate-100 text-slate-700 border-slate-200',
    dot: 'bg-slate-500',
  },
  success: {
    container: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dot: 'bg-emerald-500',
  },
  warning: {
    container: 'bg-amber-50 text-amber-700 border-amber-200',
    dot: 'bg-amber-500',
  },
  danger: {
    container: 'bg-red-50 text-red-700 border-red-200',
    dot: 'bg-red-500',
  },
  info: {
    container: 'bg-blue-50 text-blue-700 border-blue-200',
    dot: 'bg-blue-500',
  },
  primary: {
    container: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    dot: 'bg-indigo-500',
  },
};

export function Badge({ children, variant = 'default', className = '', dot = true }: BadgeProps) {
  const styles = variantClasses[variant] || variantClasses.default;
  return (
    <span
      className={`
        inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold
        border shadow-2xs tracking-tight
        ${styles.container}
        ${className}
      `}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${styles.dot}`} />}
      <span>{children}</span>
    </span>
  );
}

/* ─── Status-specific badge helpers ─── */

const projectStatusVariants: Record<ProjectStatus, BadgeVariant> = {
  draft: 'default',
  active: 'success',
  completed: 'primary',
  archived: 'warning',
};

const activityStatusVariants: Record<ActivityStatus, BadgeVariant> = {
  planned: 'default',
  active: 'info',
  completed: 'success',
};

const reportStatusVariants: Record<ReportStatus, BadgeVariant> = {
  draft: 'default',
  generated: 'info',
  final: 'success',
};

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  return (
    <Badge variant={projectStatusVariants[status] || 'default'}>
      {status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Unknown'}
    </Badge>
  );
}

export function ActivityStatusBadge({ status }: { status: ActivityStatus }) {
  return (
    <Badge variant={activityStatusVariants[status] || 'default'}>
      {status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Planned'}
    </Badge>
  );
}

export function ReportStatusBadge({ status }: { status: ReportStatus }) {
  return (
    <Badge variant={reportStatusVariants[status] || 'default'}>
      {status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Draft'}
    </Badge>
  );
}
