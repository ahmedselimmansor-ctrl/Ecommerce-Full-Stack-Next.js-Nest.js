import { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

// Colour utilities (bg-ink, text-paper, …) come from the @theme block in globals.css.
const VARIANTS: Record<Variant, string> = {
  primary: 'bg-ink text-paper hover:bg-ink-soft disabled:bg-ink-faint',
  secondary: 'border border-ink bg-transparent text-ink hover:bg-ink hover:text-paper',
  ghost: 'bg-transparent text-ink-soft hover:bg-paper-dim hover:text-ink',
  danger: 'bg-clay text-white hover:bg-clay-soft',
};

const SIZES: Record<Size, string> = {
  sm: 'h-9 px-4 text-[0.6875rem]',
  md: 'h-11 px-6 text-xs',
  lg: 'h-12 px-8 text-xs',
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  isLoading?: boolean;
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'primary', size = 'md', isLoading = false, fullWidth = false, disabled, children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || isLoading}
      aria-busy={isLoading}
      className={cn(
        'inline-flex items-center justify-center gap-2 font-medium uppercase tracking-[0.14em]',
        'transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-60',
        VARIANTS[variant],
        SIZES[size],
        fullWidth && 'w-full',
        className,
      )}
      {...props}
    >
      {isLoading && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
});
