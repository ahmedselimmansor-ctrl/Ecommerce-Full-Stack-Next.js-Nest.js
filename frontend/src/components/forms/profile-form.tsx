'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { api, ClientApiError } from '@/lib/api-client';
import { buildProfileSchema, type ProfileInput } from '@/schemas/checkout';
import { useAuthStore } from '@/store/auth-store';
import { useT } from '@/i18n/provider';
import type { User } from '@/types';

export function ProfileForm({ user }: { user: User }) {
  const t = useT();
  const router = useRouter();
  const setUser = useAuthStore((state) => state.setUser);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProfileInput>({
    resolver: zodResolver(buildProfileSchema(t)),
    defaultValues: {
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone ?? '',
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      const updated = await api.patch<User>('/users/me', {
        firstName: values.firstName,
        lastName: values.lastName,
        phone: values.phone || undefined,
      });
      setUser(updated);
      toast.success(t.account.profileUpdated);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof ClientApiError ? error.message : t.account.profileFailed);
    }
  });

  return (
    <form onSubmit={onSubmit} className="max-w-md space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="firstName" className="eyebrow mb-1.5 block">
            {t.account.firstName}
          </label>
          <input id="firstName" {...register('firstName')} className="field" />
          {errors.firstName && <p className="mt-1 text-xs text-clay">{errors.firstName.message}</p>}
        </div>

        <div>
          <label htmlFor="lastName" className="eyebrow mb-1.5 block">
            {t.account.lastName}
          </label>
          <input id="lastName" {...register('lastName')} className="field" />
          {errors.lastName && <p className="mt-1 text-xs text-clay">{errors.lastName.message}</p>}
        </div>
      </div>

      <div>
        <label htmlFor="phone" className="eyebrow mb-1.5 block">
          {t.account.phone}
        </label>
        <input id="phone" inputMode="tel" dir="ltr" {...register('phone')} className="field" />
        {errors.phone && <p className="mt-1 text-xs text-clay">{errors.phone.message}</p>}
      </div>

      <div>
        <label className="eyebrow mb-1.5 block">{t.account.email}</label>
        <input value={user.email} disabled dir="ltr" className="field" />
        <p className="mt-1 text-xs text-ink-faint">{t.account.emailLocked}</p>
      </div>

      <Button type="submit" isLoading={isSubmitting} disabled={!isDirty}>
        {t.account.saveChanges}
      </Button>
    </form>
  );
}
