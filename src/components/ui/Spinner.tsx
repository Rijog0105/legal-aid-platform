import { Loader2 } from 'lucide-react';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-8 h-8',
  lg: 'w-12 h-12',
};

export function Spinner({ size = 'md', className = '' }: SpinnerProps) {
  return (
    <Loader2
      className={`animate-spin text-primary-500 ${sizeClasses[size]} ${className}`}
    />
  );
}

/**
 * Full-page loading state.
 */
export function PageLoader({ message }: { message?: string }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 min-h-[50vh]">
      <Spinner size="lg" />
      {message && (
        <p className="text-sm text-surface-500 animate-pulse-soft">{message}</p>
      )}
    </div>
  );
}
