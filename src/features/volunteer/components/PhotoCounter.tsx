interface PhotoCounterProps {
  count: number;
  max: number;
}

/**
 * Small pill showing "X / max photos" for the currently selected activity.
 * Switches to an amber/warning style once the limit is reached.
 */
export function PhotoCounter({ count, max }: PhotoCounterProps) {
  const atLimit = count >= max;
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${
        atLimit
          ? 'bg-amber-50 text-amber-700 border-amber-200'
          : 'bg-primary-50 text-primary-700 border-primary-200'
      }`}
    >
      {count} / {max} photos
    </span>
  );
}
