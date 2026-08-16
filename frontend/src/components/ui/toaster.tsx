'use client';

import { Toaster as SonnerToaster } from 'sonner';

/**
 * Global toast host. Mounted once in the root layout; every mutation surfaces
 * its result here rather than inventing per-page banners.
 */
export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      duration={4000}
      closeButton
      toastOptions={{
        classNames: {
          toast: 'border border-line bg-white text-ink shadow-none rounded-none',
          title: 'text-sm font-medium',
          description: 'text-xs text-ink-soft',
          actionButton: 'bg-ink text-paper text-xs uppercase tracking-wider',
          cancelButton: 'bg-paper-dim text-ink-soft text-xs',
          error: 'border-clay',
          success: 'border-sage',
        },
      }}
    />
  );
}
