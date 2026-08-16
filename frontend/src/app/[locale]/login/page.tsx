import type { Metadata } from 'next';
import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { LoginForm } from '@/components/forms/login-form';
import { getCurrentUser } from '@/lib/queries';
import { getDictionary, toLocale } from '@/i18n';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const t = getDictionary(toLocale((await params).locale));
  return { title: t.auth.signIn, robots: { index: false, follow: false } };
}

export default async function LoginPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = toLocale((await params).locale);
  const t = getDictionary(locale);

  if (await getCurrentUser()) redirect(`/${locale}/account`);

  return (
    <div className="container-page flex justify-center py-16">
      <div className="w-full max-w-sm">
        <header className="mb-8 text-center">
          <p className="eyebrow">{t.auth.welcomeBack}</p>
          <h1 className="mt-2 font-display text-3xl">{t.auth.signIn}</h1>
        </header>

        {/* useSearchParams needs a Suspense boundary to keep the page static. */}
        <Suspense fallback={<div className="h-80" aria-hidden />}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
