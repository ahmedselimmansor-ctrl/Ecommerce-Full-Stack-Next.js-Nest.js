import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/queries';
import { getDictionary, toLocale } from '@/i18n';
import { AdminNav } from '@/components/admin/admin-nav';

/**
 * Role gate for the whole dashboard.
 *
 * This is defence in depth, not the actual control: every admin endpoint is
 * guarded server-side by the ADMIN role, so a non-admin who forges their way
 * past this layout still sees nothing but 403s.
 */
export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const locale = toLocale((await params).locale);
  const t = getDictionary(locale);
  const user = await getCurrentUser();

  if (!user) redirect(`/${locale}/login?next=/${locale}/admin`);

  if (user.role !== 'ADMIN') {
    return (
      <div className="container-page flex min-h-[60vh] flex-col items-center justify-center text-center">
        <p className="eyebrow">403</p>
        <h1 className="mt-3 font-display text-3xl">{t.admin.forbiddenTitle}</h1>
        <p className="mt-3 max-w-sm text-sm text-ink-soft">{t.admin.forbiddenBody}</p>
      </div>
    );
  }

  return (
    <div className="container-page py-8">
      <header className="mb-8">
        <p className="eyebrow">{t.admin.console}</p>
        <h1 className="mt-1 font-display text-3xl">{t.admin.dashboard}</h1>
      </header>

      <AdminNav />

      <div className="mt-8">{children}</div>
    </div>
  );
}
