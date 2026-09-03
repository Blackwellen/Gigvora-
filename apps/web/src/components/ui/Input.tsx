import { forwardRef } from 'react';
import { cn } from '@/lib/cn';

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...props },
  ref
) {
  return (
    <input
      ref={ref}
      className={cn(
        'h-10 w-full rounded-control border border-ink-200 bg-white px-3 text-sm text-ink-900 placeholder:text-ink-400 transition-colors duration-150 ease-out focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-ink-700 dark:bg-ink-900 dark:text-white dark:placeholder:text-ink-500',
        className
      )}
      {...props}
    />
  );
});
