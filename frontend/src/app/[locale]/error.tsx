'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useT } from '@/i18n/provider';
import { fmt } from '@/i18n';

export default function LocaleError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useT();

  useEffect(() => {
    // Cloud Run captures stderr into Cloud Logging automatically.
    console.error('Unhandled page error:', error);
  }, [error]);

  return (
    <div className="container-page flex min-h-[60vh] flex-col items-center justify-center text-center">
      <p className="eyebrow">{t.errors.errorEyebrow}</p>
      <h1 className="mt-3 font-display text-3xl">{t.errors.errorTitle}</h1>
      <p className="mt-3 max-w-sm text-sm text-ink-soft">{t.errors.errorBody}</p>
      {error.digest && (
        <p className="mt-2 text-xs tabular-nums text-ink-faint">{fmt(t.errors.reference, { digest: error.digest })}</p>
      )}

      <Button onClick={reset} className="mt-8">
        {t.common.tryAgain}
      </Button>
    </div>
  );
}
