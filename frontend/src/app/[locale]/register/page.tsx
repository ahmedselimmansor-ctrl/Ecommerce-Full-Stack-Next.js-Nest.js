import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { RegisterForm } from '@/components/forms/register-form';
import { getCurrentUser } from '@/lib/queries';
import { getDictionary, toLocale } from '@/i18n';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const t = getDictionary(toLocale((await params).locale));
  return { title: t.auth.createAccount, robots: { index: false, follow: false } };
}

export default async function RegisterPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = toLocale((await params).locale);
  const t = getDictionary(locale);

  if (await getCurrentUser()) redirect(`/${locale}/account`);

  return (
    <div className="container-page flex justify-center py-16">
      <div className="w-full max-w-md">
        <header className="mb-8 text-center">
          <p className="eyebrow">{t.auth.joinTitle}</p>
          <h1 className="mt-2 font-display text-3xl">{t.auth.createAccount}</h1>
          <p className="mt-2 text-sm text-ink-soft">{t.auth.joinBody}</p>
        </header>

        <RegisterForm />
      </div>
    </div>
  );
}
