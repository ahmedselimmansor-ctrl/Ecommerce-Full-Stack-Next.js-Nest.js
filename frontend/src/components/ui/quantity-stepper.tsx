'use client';

import { Minus, Plus } from 'lucide-react';
import { useT } from '@/i18n/provider';
import { fmt } from '@/i18n';
import { cn } from '@/lib/utils';

interface QuantityStepperProps {
  value: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
  className?: string;
  label?: string;
}

export function QuantityStepper({ value, min = 1, max = 20, onChange, className, label }: QuantityStepperProps) {
  const t = useT();
  const fieldLabel = label ?? t.common.quantity;

  return (
    <div className={cn('inline-flex items-center border border-line bg-surface', className)}>
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        aria-label={fmt(t.cart.decrease, { label: fieldLabel })}
        className="flex size-10 items-center justify-center text-ink-soft transition-colors hover:bg-paper-dim disabled:opacity-30"
      >
        <Minus className="size-3.5" aria-hidden />
      </button>

      <span className="w-10 text-center text-sm tabular-nums" aria-live="polite">
        {value}
      </span>

      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        aria-label={fmt(t.cart.increase, { label: fieldLabel })}
        className="flex size-10 items-center justify-center text-ink-soft transition-colors hover:bg-paper-dim disabled:opacity-30"
      >
        <Plus className="size-3.5" aria-hidden />
      </button>
    </div>
  );
}
