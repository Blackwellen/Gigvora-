'use client';

import { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger';
type Size = 'sm' | 'md' | 'lg' | 'icon';

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-brand-600 text-white shadow-button-primary hover:bg-brand-500 hover:shadow-button-primary-hover disabled:bg-brand-300 disabled:shadow-none dark:hover:bg-brand-500',
  secondary:
    'bg-ink-100 text-ink-800 shadow-sm hover:bg-ink-200 hover:shadow disabled:opacity-50 dark:bg-ink-800 dark:text-ink-100 dark:hover:bg-ink-700',
  ghost: 'text-ink-600 hover:bg-ink-100 disabled:opacity-50 dark:text-ink-300 dark:hover:bg-ink-800',
  outline:
    'border border-ink-200 text-ink-700 hover:border-ink-300 hover:bg-ink-50 disabled:opacity-50 dark:border-ink-700 dark:text-ink-200 dark:hover:border-ink-600 dark:hover:bg-ink-800',
  danger:
    'bg-red-600 text-white shadow-button-danger hover:bg-red-500 hover:shadow-button-danger-hover disabled:bg-red-300 disabled:shadow-none',
};

const SIZES: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-5 text-sm gap-2',
  icon: 'h-9 w-9 justify-center',
};

export const Button = forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size; loading?: boolean }
>(function Button({ className, variant = 'primary', size = 'md', loading, disabled, children, ...props }, ref) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center rounded-xl font-display font-semibold tracking-[-0.01em] transition-all duration-200 ease-out hover:-translate-y-px active:translate-y-0 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:pointer-events-none disabled:cursor-not-allowed disabled:translate-y-0 disabled:scale-100 dark:focus-visible:ring-offset-ink-950',
        VARIANTS[variant],
        SIZES[size],
        className
      )}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
});
