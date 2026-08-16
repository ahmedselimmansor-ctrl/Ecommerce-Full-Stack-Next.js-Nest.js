'use client';

import type { ReactNode } from 'react';
import { Link } from '@/i18n/provider';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: ReactNode;
  action?: { href: string; label: string };
}

export function EmptyState({ title, description, icon, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center border border-dashed border-line px-6 py-20 text-center">
      {icon && <div className="mb-5 text-ink-faint">{icon}</div>}
      <h2 className="font-display text-2xl">{title}</h2>
      <p className="mt-2 max-w-sm text-sm text-ink-soft">{description}</p>
      {action && (
        <Link
          href={action.href}
          className="mt-6 border-b border-ink pb-0.5 text-xs uppercase tracking-[0.14em] tracking-wide-latin transition-opacity hover:opacity-60"
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}
