import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-[0.98] shadow-xs hover:shadow-sm shadow-indigo-500/20 font-bold',
  secondary:
    'bg-slate-100 text-slate-700 hover:bg-slate-200/80 active:scale-[0.98] border border-slate-200 font-semibold',
  ghost:
    'bg-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 active:scale-[0.98] font-semibold',
  danger:
    'bg-red-600 text-white hover:bg-red-700 active:scale-[0.98] shadow-xs shadow-red-600/20 font-bold',
  outline:
    'bg-white text-slate-700 border border-slate-300 hover:border-slate-400 hover:bg-slate-50 active:scale-[0.98] font-semibold',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs gap-1.5 rounded-xl',
  md: 'px-4 py-2.5 text-xs sm:text-sm gap-2 rounded-xl',
  lg: 'px-6 py-3 text-sm sm:text-base gap-2.5 rounded-2xl',
};

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  children,
  disabled,
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button
      className={`
        inline-flex items-center justify-center
        transition-all duration-150 ease-out select-none
        disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:active:scale-100
        cursor-pointer
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
      ) : (
        leftIcon && <span className="shrink-0">{leftIcon}</span>
      )}
      <span>{children}</span>
      {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
    </button>
  );
}
