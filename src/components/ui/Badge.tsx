import type { CampStatus, ActivityStatus, ReportStatus } from '@/constants';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'primary';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-surface-100 text-surface-700 border-surface-200',
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  warning: 'bg-amber-50 text-amber-700 border-amber-200',
  danger: 'bg-red-50 text-red-700 border-red-200',
  info: 'bg-blue-50 text-blue-700 border-blue-200',
  primary: 'bg-primary-50 text-primary-700 border-primary-200',
};

export function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
        border
        ${variantClasses[variant]}
        ${className}
      `}
    >
      {children}
    </span>
  );
}

/* ─── Status-specific badge helpers ─── */

const campStatusVariants: Record<CampStatus, BadgeVariant> = {
  draft: 'default',
  active: 'success',
  completed: 'info',
  archived: 'warning',
};

const activityStatusVariants: Record<ActivityStatus, BadgeVariant> = {
  planned: 'default',
  active: 'success',
  completed: 'info',
};

const reportStatusVariants: Record<ReportStatus, BadgeVariant> = {
  draft: 'default',
  generated: 'info',
  final: 'success',
};

export function CampStatusBadge({ status }: { status: CampStatus }) {
  return (
    <Badge variant={campStatusVariants[status]}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

export function ActivityStatusBadge({ status }: { status: ActivityStatus }) {
  return (
    <Badge variant={activityStatusVariants[status]}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

export function ReportStatusBadge({ status }: { status: ReportStatus }) {
  return (
    <Badge variant={reportStatusVariants[status]}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}
