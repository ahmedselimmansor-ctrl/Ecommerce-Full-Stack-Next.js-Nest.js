'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Pencil, Plus, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api, ClientApiError, revalidateCatalogue } from '@/lib/api-client';
import { buildCategorySchema, type CategoryFormInput } from '@/schemas/admin';
import { useI18n } from '@/i18n/provider';
import { localized } from '@/i18n';
import { cn, formatNumber } from '@/lib/utils';
import type { CategoryNode } from '@/types';

/**
 * Categories are few and shallow, so they are managed inline on one page rather
 * than getting their own create/edit routes.
 */
export function CategoryManager({ categories }: { categories: CategoryNode[] }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [editing, setEditing] = useState<CategoryNode | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const isFormOpen = isCreating || editing !== null;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CategoryFormInput>({
    resolver: zodResolver(buildCategorySchema(t)),
    defaultValues: { name: '', nameAr: '', slug: '', description: '', descriptionAr: '', imageUrl: '' },
  });

  const openCreate = () => {
    reset({ name: '', nameAr: '', slug: '', description: '', descriptionAr: '', imageUrl: '' });
    setEditing(null);
    setIsCreating(true);
  };

  const openEdit = (category: CategoryNode) => {
    reset({
      name: category.name,
      nameAr: category.nameAr ?? '',
      slug: category.slug,
      description: category.description ?? '',
      descriptionAr: category.descriptionAr ?? '',
      imageUrl: category.imageUrl ?? '',
    });
    setIsCreating(false);
    setEditing(category);
  };

  const close = () => {
    setIsCreating(false);
    setEditing(null);
  };

  const onSubmit = handleSubmit(async (values) => {
    const payload = {
      name: values.name,
      nameAr: values.nameAr || undefined,
      slug: values.slug,
      description: values.description || undefined,
      descriptionAr: values.descriptionAr || undefined,
      imageUrl: values.imageUrl || undefined,
    };

    try {
      if (editing) await api.patch(`/categories/${editing.id}`, payload);
      else await api.post('/categories', payload);

      await revalidateCatalogue();
      toast.success(t.admin.categorySaved);
      close();
      router.refresh();
    } catch (error) {
      toast.error(error instanceof ClientApiError ? error.message : t.admin.categoryFailed);
    }
  });

  const remove = async (category: CategoryNode) => {
    if (!window.confirm(t.admin.deleteCategoryConfirm)) return;

    setPendingId(category.id);
    try {
      await api.delete(`/categories/${category.id}`);
      await revalidateCatalogue();
      toast.success(t.admin.categoryDeleted);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof ClientApiError ? error.message : t.admin.categoryFailed);
    } finally {
      setPendingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="font-display text-2xl">{t.admin.categoriesTitle}</h2>
        <Button size="sm" onClick={isFormOpen ? close : openCreate}>
          {isFormOpen ? <X className="size-4" aria-hidden /> : <Plus className="size-4" aria-hidden />}
          {isFormOpen ? t.common.cancel : t.admin.newCategory}
        </Button>
      </div>

      {isFormOpen && (
        <form onSubmit={onSubmit} className="space-y-4 border border-line bg-surface p-6">
          <h3 className="font-display text-lg">{editing ? t.admin.editCategory : t.admin.newCategory}</h3>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label={t.admin.fieldNameEn} error={errors.name?.message}>
              <input {...register('name')} className="field" dir="ltr" />
            </Field>
            <Field label={t.admin.fieldNameAr} error={errors.nameAr?.message}>
              <input {...register('nameAr')} className="field" dir="rtl" />
            </Field>
            <Field label={t.admin.fieldSlug} error={errors.slug?.message}>
              <input {...register('slug')} className="field" dir="ltr" />
            </Field>
            <Field label={t.admin.imageUrl} error={errors.imageUrl?.message}>
              <input {...register('imageUrl')} className="field" dir="ltr" />
            </Field>
            <Field label={t.admin.fieldDescriptionEn} error={errors.description?.message}>
              <input {...register('description')} className="field" dir="ltr" />
            </Field>
            <Field label={t.admin.fieldDescriptionAr} error={errors.descriptionAr?.message}>
              <input {...register('descriptionAr')} className="field" dir="rtl" />
            </Field>
          </div>

          <Button type="submit" isLoading={isSubmitting}>
            {t.common.save}
          </Button>
        </form>
      )}

      <div className="overflow-x-auto border border-line">
        <table className="w-full min-w-[36rem] border-collapse text-sm">
          <thead>
            <tr className="border-b border-line bg-paper-dim text-xs text-ink-soft">
              <th scope="col" className="px-4 py-3 text-start font-normal">
                {t.admin.colName}
              </th>
              <th scope="col" className="px-4 py-3 text-start font-normal">
                {t.admin.fieldSlug}
              </th>
              <th scope="col" className="px-4 py-3 text-end font-normal">
                {t.admin.colProducts}
              </th>
              <th scope="col" className="px-4 py-3 text-end font-normal">
                {t.common.actions}
              </th>
            </tr>
          </thead>

          <tbody>
            {categories.map((category) => (
              <tr key={category.id} className="border-b border-line last:border-0">
                <td className="px-4 py-3">{localized(locale, category.name, category.nameAr)}</td>
                <td className="px-4 py-3 text-xs text-ink-faint" dir="ltr">
                  {category.slug}
                </td>
                <td className="px-4 py-3 text-end tabular-nums">{formatNumber(category.productCount, locale)}</td>
                <td className="px-4 py-3 text-end">
                  <div className="inline-flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEdit(category)}
                      aria-label={t.common.edit}
                      className="p-2 text-ink-soft transition-colors hover:text-ink"
                    >
                      <Pencil className="size-4" aria-hidden />
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(category)}
                      disabled={pendingId === category.id || category.productCount > 0}
                      title={category.productCount > 0 ? t.admin.deleteCategoryConfirm : t.common.delete}
                      aria-label={t.common.delete}
                      className={cn(
                        'p-2 text-ink-soft transition-colors hover:text-clay',
                        (pendingId === category.id || category.productCount > 0) && 'opacity-30',
                      )}
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="eyebrow mb-1.5 block">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-clay">{error}</p>}
    </div>
  );
}
