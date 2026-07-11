import { forwardRef, type InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, id, className = '', ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-surface-700"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`
            w-full px-4 py-2.5 rounded-xl border text-sm
            bg-white text-surface-900
            border-surface-300
            placeholder:text-surface-400
            focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500
            disabled:bg-surface-100 disabled:text-surface-500 disabled:cursor-not-allowed
            transition-all duration-200
            ${error ? 'border-red-500 focus:ring-red-500/30 focus:border-red-500' : ''}
            ${className}
          `}
          {...props}
        />
        {error && (
          <p className="text-xs text-red-600 mt-0.5">{error}</p>
        )}
        {helperText && !error && (
          <p className="text-xs text-surface-500 mt-0.5">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
