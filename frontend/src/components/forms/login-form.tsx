'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { authApi, ClientApiError } from '@/lib/api-client';
import { buildLoginSchema, type LoginInput } from '@/schemas/auth';
import { useAuthStore } from '@/store/auth-store';
import { Link, useI18n } from '@/i18n/provider';
import { fmt, localizePath } from '@/i18n';

export function LoginForm() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const setUser = useAuthStore((state) => state.setUser);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(buildLoginSchema(t)) });

  const onSubmit = handleSubmit(async (values) => {
    try {
      const { user } = await authApi.login(values);
      setUser(user);
      toast.success(fmt(t.auth.signInGreeting, { name: user.firstName }));

      // Only same-site paths are honoured, so `?next=` cannot be used as an
      // open redirect.
      const next = searchParams.get('next');
      const destination = next?.startsWith('/') ? next : localizePath('/account', locale);

      router.push(destination);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof ClientApiError ? error.message : t.auth.signInFailed);
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <div>
        <label htmlFor="email" className="eyebrow mb-1.5 block">
          {t.auth.email}
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          dir="ltr"
          {...register('email')}
          aria-invalid={Boolean(errors.email)}
          className="field"
        />
        {errors.email && <p className="mt-1 text-xs text-clay">{errors.email.message}</p>}
      </div>

      <div>
        <label htmlFor="password" className="eyebrow mb-1.5 block">
          {t.auth.password}
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          dir="ltr"
          {...register('password')}
          aria-invalid={Boolean(errors.password)}
          className="field"
        />
        {errors.password && <p className="mt-1 text-xs text-clay">{errors.password.message}</p>}
      </div>

      <Button type="submit" size="lg" fullWidth isLoading={isSubmitting}>
        {t.auth.signIn}
      </Button>

      <p className="text-center text-xs text-ink-soft">
        {t.auth.newHere}{' '}
        <Link href="/register" className="border-b border-ink pb-0.5 text-ink">
          {t.auth.createAccount}
        </Link>
      </p>
    </form>
  );
}
