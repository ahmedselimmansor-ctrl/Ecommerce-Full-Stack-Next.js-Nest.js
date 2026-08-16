import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RatingStarsProps {
  value: number;
  count?: number;
  size?: number;
  className?: string;
  /** Accessible description; the caller supplies it already translated. */
  label?: string;
}

export function RatingStars({ value, count, size = 14, className, label }: RatingStarsProps) {
  const rounded = Math.round(value);

  return (
    <span
      className={cn('inline-flex items-center gap-1.5', className)}
      aria-label={label ?? `${value.toFixed(1)} / 5`}
    >
      <span className="flex items-center gap-0.5" aria-hidden>
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            width={size}
            height={size}
            className={star <= rounded ? 'fill-ink text-ink' : 'text-line'}
          />
        ))}
      </span>
      {count !== undefined && <span className="text-xs tabular-nums text-ink-faint">({count})</span>}
    </span>
  );
}
