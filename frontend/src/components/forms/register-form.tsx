'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { authApi, ClientApiError } from '@/lib/api-client';
import { buildRegisterSchema, type RegisterInput } from '@/schemas/auth';
import { useAuthStore } from '@/store/auth-store';
import { Link, useI18n } from '@/i18n/provider';
import { fmt, localizePath } from '@/i18n';

export function RegisterForm() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const setUser = useAuthStore((state) => state.setUser);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({ resolver: zodResolver(buildRegisterSchema(t)) });

  const onSubmit = handleSubmit(async (values) => {
    try {
      const { user } = await authApi.register({
        email: values.email,
        password: values.password,
        firstName: values.firstName,
        lastName: values.lastName,
        phone: values.phone || undefined,
      });

      setUser(user);
      toast.success(fmt(t.auth.welcome, { name: user.firstName }));
      router.push(localizePath('/account', locale));
      router.refresh();
    } catch (error) {
      toast.error(error instanceof ClientApiError ? error.message : t.auth.registerFailed);
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="firstName" className="eyebrow mb-1.5 block">
            {t.auth.firstName}
          </label>
          <input id="firstName" autoComplete="given-name" {...register('firstName')} className="field" />
          {errors.firstName && <p className="mt-1 text-xs text-clay">{errors.firstName.message}</p>}
        </div>

        <div>
          <label htmlFor="lastName" className="eyebrow mb-1.5 block">
            {t.auth.lastName}
          </label>
          <input id="lastName" autoComplete="family-name" {...register('lastName')} className="field" />
          {errors.lastName && <p className="mt-1 text-xs text-clay">{errors.lastName.message}</p>}
        </div>
      </div>

      <div>
        <label htmlFor="email" className="eyebrow mb-1.5 block">
          {t.auth.email}
        </label>
        <input id="email" type="email" autoComplete="email" dir="ltr" {...register('email')} className="field" />
        {errors.email && <p className="mt-1 text-xs text-clay">{errors.email.message}</p>}
      </div>

      <div>
        <label htmlFor="phone" className="eyebrow mb-1.5 block">
          {fmt(t.auth.phoneOptional, { optional: t.common.optional })}
        </label>
        <input id="phone" inputMode="tel" autoComplete="tel" dir="ltr" {...register('phone')} className="field" />
        {errors.phone && <p className="mt-1 text-xs text-clay">{errors.phone.message}</p>}
      </div>

      <div>
        <label htmlFor="password" className="eyebrow mb-1.5 block">
          {t.auth.password}
        </label>
        <input
          id="password"
          type="password"
          autoComplete="new-password"
          dir="ltr"
          {...register('password')}
          className="field"
        />
        {errors.password ? (
          <p className="mt-1 text-xs text-clay">{errors.password.message}</p>
        ) : (
          <p className="mt-1 text-xs text-ink-faint">{t.auth.passwordHint}</p>
        )}
      </div>

      <div>
        <label htmlFor="confirmPassword" className="eyebrow mb-1.5 block">
          {t.auth.confirmPassword}
        </label>
        <input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          dir="ltr"
          {...register('confirmPassword')}
          className="field"
        />
        {errors.confirmPassword && <p className="mt-1 text-xs text-clay">{errors.confirmPassword.message}</p>}
      </div>

      <Button type="submit" size="lg" fullWidth isLoading={isSubmitting}>
        {t.auth.createAccount}
      </Button>

      <p className="text-center text-xs text-ink-soft">
        {t.auth.haveAccount}{' '}
        <Link href="/login" className="border-b border-ink pb-0.5 text-ink">
          {t.auth.signIn}
        </Link>
      </p>
    </form>
  );
}
