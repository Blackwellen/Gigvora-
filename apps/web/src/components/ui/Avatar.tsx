import { cn } from '@/lib/cn';

const SIZES = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-base',
  xl: 'h-20 w-20 text-xl',
};

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}

export function Avatar({
  src,
  name,
  size = 'md',
  online,
  className,
}: {
  src?: string | null;
  name: string;
  size?: keyof typeof SIZES;
  online?: boolean;
  className?: string;
}) {
  return (
    <span className={cn('relative inline-flex shrink-0', className)}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={name}
          className={cn('rounded-full object-cover ring-1 ring-black/5', SIZES[size])}
        />
      ) : (
        <span
          className={cn(
            'flex items-center justify-center rounded-full bg-brand-100 font-semibold text-brand-700 ring-1 ring-black/5',
            SIZES[size]
          )}
          aria-hidden
        >
          {initials(name) || '?'}
        </span>
      )}
      {online !== undefined && (
        <span
          className={cn(
            'absolute bottom-0 right-0 rounded-full ring-2 ring-white',
            size === 'xs' || size === 'sm' ? 'h-2 w-2' : 'h-2.5 w-2.5',
            online ? 'bg-emerald-500' : 'bg-ink-300'
          )}
        />
      )}
    </span>
  );
}
