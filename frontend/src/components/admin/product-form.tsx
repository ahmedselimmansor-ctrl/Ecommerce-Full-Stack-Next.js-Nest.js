'use client';

import { useRouter } from 'next/navigation';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api, ClientApiError, revalidateCatalogue } from '@/lib/api-client';
import { buildProductSchema, type ProductFormInput } from '@/schemas/admin';
import { useI18n } from '@/i18n/provider';
import { fmt, localized, localizePath } from '@/i18n';
import { CURRENCY } from '@/lib/env';
import { cn } from '@/lib/utils';
import type { AdminProduct, CategoryNode } from '@/types';

interface ProductFormProps {
  categories: CategoryNode[];
  /** Absent when creating. */
  product?: AdminProduct;
}

/** Minor units in the API, major units in the form — merchants think in pounds. */
const toMajor = (cents: number | null | undefined) => (cents === null || cents === undefined ? '' : cents / 100);
const toMinor = (value: number | string | undefined) =>
  value === '' || value === undefined ? undefined : Math.round(Number(value) * 100);

export function ProductForm({ categories, product }: ProductFormProps) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const isEditing = Boolean(product);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormInput>({
    resolver: zodResolver(buildProductSchema(t)),
    defaultValues: {
      name: product?.name ?? '',
      nameAr: product?.nameAr ?? '',
      slug: product?.slug ?? '',
      description: product?.description ?? '',
      descriptionAr: product?.descriptionAr ?? '',
      price: (toMajor(product?.priceCents) as number) || 0,
      compareAt: toMajor(product?.compareAtCents) as number | '',
      categoryId: product?.category.id ?? categories[0]?.id ?? '',
      gender: product?.gender ?? 'UNISEX',
      material: product?.material ?? '',
      materialAr: product?.materialAr ?? '',
      care: product?.care ?? '',
      careAr: product?.careAr ?? '',
      isActive: product?.isActive ?? true,
      isFeatured: product?.isFeatured ?? false,
      images: product?.images.map((image) => ({ url: image.url, alt: image.alt ?? '' })) ?? [
        { url: '', alt: '' },
      ],
      variants: product?.variants.map((variant) => ({
        sku: variant.sku,
        size: variant.size,
        color: variant.color,
        colorAr: variant.colorAr ?? '',
        colorHex: variant.colorHex ?? '',
        stock: variant.stock,
      })) ?? [{ sku: '', size: 'M', color: '', colorAr: '', colorHex: '#111111', stock: 0 }],
    },
  });

  const images = useFieldArray({ control, name: 'images' });
  const variants = useFieldArray({ control, name: 'variants' });

  const onSubmit = handleSubmit(async (values) => {
    const payload = {
      name: values.name,
      nameAr: values.nameAr || undefined,
      slug: values.slug,
      description: values.description,
      descriptionAr: values.descriptionAr || undefined,
      priceCents: toMinor(values.price),
      compareAtCents: toMinor(values.compareAt as number | undefined),
      categoryId: values.categoryId,
      gender: values.gender,
      material: values.material || undefined,
      materialAr: values.materialAr || undefined,
      care: values.care || undefined,
      careAr: values.careAr || undefined,
      isActive: values.isActive,
      isFeatured: values.isFeatured,
      images: values.images.map((image, index) => ({
        url: image.url,
        alt: image.alt || undefined,
        position: index,
      })),
      variants: values.variants.map((variant) => ({
        sku: variant.sku.trim().toUpperCase(),
        size: variant.size.trim().toUpperCase(),
        color: variant.color.trim(),
        colorAr: variant.colorAr || undefined,
        colorHex: variant.colorHex || undefined,
        stock: Number(variant.stock),
      })),
    };

    try {
      if (isEditing && product) {
        await api.patch(`/products/${product.id}`, payload);
        toast.success(t.admin.productSaved);
      } else {
        await api.post('/products', payload);
        toast.success(t.admin.productCreated);
      }

      await revalidateCatalogue();
      router.push(localizePath('/admin/products', locale));
      router.refresh();
    } catch (error) {
      toast.error(error instanceof ClientApiError ? error.message : t.admin.productFailed);
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-10">
      <Section title={isEditing ? t.admin.editProduct : t.admin.newProduct}>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label={t.admin.fieldNameEn} error={errors.name?.message}>
            <input {...register('name')} className="field" dir="ltr" />
          </Field>

          <Field label={t.admin.fieldNameAr} error={errors.nameAr?.message}>
            <input {...register('nameAr')} className="field" dir="rtl" />
          </Field>

          <Field label={t.admin.fieldSlug} error={errors.slug?.message} hint={t.admin.fieldSlugHint}>
            <input {...register('slug')} className="field" dir="ltr" />
          </Field>

          <Field label={t.admin.fieldCategory} error={errors.categoryId?.message}>
            <select {...register('categoryId')} className="field">
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {localized(locale, category.name, category.nameAr)}
                </option>
              ))}
            </select>
          </Field>

          <Field label={t.admin.fieldDescriptionEn} error={errors.description?.message} className="md:col-span-2">
            <textarea {...register('description')} rows={3} className="field resize-none" dir="ltr" />
          </Field>

          <Field label={t.admin.fieldDescriptionAr} error={errors.descriptionAr?.message} className="md:col-span-2">
            <textarea {...register('descriptionAr')} rows={3} className="field resize-none" dir="rtl" />
          </Field>

          <Field
            label={t.admin.fieldPrice}
            error={errors.price?.message}
            hint={fmt(t.admin.fieldPriceHint, { currency: CURRENCY })}
          >
            <input type="number" step="0.01" min="0" {...register('price')} className="field" dir="ltr" />
          </Field>

          <Field
            label={fmt(t.admin.fieldCompareAt, { optional: t.common.optional })}
            error={errors.compareAt?.message}
            hint={t.admin.fieldCompareAtHint}
          >
            <input type="number" step="0.01" min="0" {...register('compareAt')} className="field" dir="ltr" />
          </Field>

          <Field label={t.admin.fieldGender} error={errors.gender?.message}>
            <select {...register('gender')} className="field">
              <option value="UNISEX">{t.products.genderUnisex}</option>
              <option value="WOMEN">{t.products.genderWomen}</option>
              <option value="MEN">{t.products.genderMen}</option>
              <option value="KIDS">{t.products.genderKids}</option>
            </select>
          </Field>

          <div className="flex items-end gap-6">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" {...register('isActive')} className="size-4 accent-[var(--color-ink)]" />
              {t.admin.fieldActive}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" {...register('isFeatured')} className="size-4 accent-[var(--color-ink)]" />
              {t.admin.fieldFeatured}
            </label>
          </div>

          <Field label={t.admin.fieldMaterialEn} error={errors.material?.message}>
            <input {...register('material')} className="field" dir="ltr" />
          </Field>

          <Field label={t.admin.fieldMaterialAr} error={errors.materialAr?.message}>
            <input {...register('materialAr')} className="field" dir="rtl" />
          </Field>

          <Field label={t.admin.fieldCareEn} error={errors.care?.message}>
            <input {...register('care')} className="field" dir="ltr" />
          </Field>

          <Field label={t.admin.fieldCareAr} error={errors.careAr?.message}>
            <input {...register('careAr')} className="field" dir="rtl" />
          </Field>
        </div>
      </Section>

      <Section title={t.admin.images} hint={t.admin.imagesHint}>
        <ul className="space-y-3">
          {images.fields.map((field, index) => (
            <li key={field.id} className="flex flex-wrap items-start gap-3">
              <div className="min-w-0 flex-1">
                <input
                  {...register(`images.${index}.url`)}
                  placeholder={t.admin.imageUrl}
                  className="field"
                  dir="ltr"
                />
                {errors.images?.[index]?.url && (
                  <p className="mt-1 text-xs text-clay">{errors.images[index]?.url?.message}</p>
                )}
              </div>
              <input
                {...register(`images.${index}.alt`)}
                placeholder={t.admin.imageAlt}
                className="field sm:max-w-56"
              />
              <button
                type="button"
                onClick={() => images.remove(index)}
                disabled={images.fields.length === 1}
                aria-label={t.admin.removeImage}
                className="p-3 text-ink-soft transition-colors hover:text-clay disabled:opacity-30"
              >
                <Trash2 className="size-4" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
        {errors.images?.root && <p className="mt-2 text-xs text-clay">{errors.images.root.message}</p>}

        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="mt-3"
          onClick={() => images.append({ url: '', alt: '' })}
        >
          <Plus className="size-4" aria-hidden />
          {t.admin.addImage}
        </Button>
      </Section>

      <Section title={t.admin.variants} hint={t.admin.variantsHint}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[46rem] border-collapse text-sm">
            <thead>
              <tr className="border-b border-line text-xs text-ink-soft">
                <th scope="col" className="px-2 py-2 text-start font-normal">
                  {t.admin.variantSku}
                </th>
                <th scope="col" className="px-2 py-2 text-start font-normal">
                  {t.admin.variantSize}
                </th>
                <th scope="col" className="px-2 py-2 text-start font-normal">
                  {t.admin.variantColourEn}
                </th>
                <th scope="col" className="px-2 py-2 text-start font-normal">
                  {t.admin.variantColourAr}
                </th>
                <th scope="col" className="px-2 py-2 text-start font-normal">
                  {t.admin.variantHex}
                </th>
                <th scope="col" className="px-2 py-2 text-start font-normal">
                  {t.admin.variantStock}
                </th>
                <th scope="col" className="px-2 py-2" />
              </tr>
            </thead>

            <tbody>
              {variants.fields.map((field, index) => (
                <tr key={field.id} className="border-b border-line last:border-0">
                  <td className="px-2 py-2">
                    <input {...register(`variants.${index}.sku`)} className="field" dir="ltr" />
                    {errors.variants?.[index]?.sku && (
                      <p className="mt-1 text-xs text-clay">{errors.variants[index]?.sku?.message}</p>
                    )}
                  </td>
                  <td className="px-2 py-2">
                    <input {...register(`variants.${index}.size`)} className="field w-20" dir="ltr" />
                  </td>
                  <td className="px-2 py-2">
                    <input {...register(`variants.${index}.color`)} className="field" dir="ltr" />
                  </td>
                  <td className="px-2 py-2">
                    <input {...register(`variants.${index}.colorAr`)} className="field" dir="rtl" />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="color"
                      {...register(`variants.${index}.colorHex`)}
                      className="h-10 w-14 cursor-pointer border border-line bg-surface"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="number"
                      min="0"
                      {...register(`variants.${index}.stock`)}
                      className="field w-24"
                      dir="ltr"
                    />
                    {errors.variants?.[index]?.stock && (
                      <p className="mt-1 text-xs text-clay">{errors.variants[index]?.stock?.message}</p>
                    )}
                  </td>
                  <td className="px-2 py-2">
                    <button
                      type="button"
                      onClick={() => variants.remove(index)}
                      disabled={variants.fields.length === 1}
                      aria-label={t.admin.removeVariant}
                      className="p-2 text-ink-soft transition-colors hover:text-clay disabled:opacity-30"
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {errors.variants?.root && <p className="mt-2 text-xs text-clay">{errors.variants.root.message}</p>}

        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="mt-3"
          onClick={() =>
            variants.append({ sku: '', size: 'M', color: '', colorAr: '', colorHex: '#111111', stock: 0 })
          }
        >
          <Plus className="size-4" aria-hidden />
          {t.admin.addVariant}
        </Button>
      </Section>

      <div className="flex items-center gap-3 border-t border-line pt-6">
        <Button type="submit" isLoading={isSubmitting} size="lg">
          {t.common.save}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          {t.common.cancel}
        </Button>
      </div>
    </form>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-display text-xl">{title}</h2>
      {hint && <p className="mb-4 mt-1 text-xs text-ink-faint">{hint}</p>}
      <div className={cn(hint ? '' : 'mt-4')}>{children}</div>
    </section>
  );
}

function Field({
  label,
  error,
  hint,
  className,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <label className="eyebrow mb-1.5 block">{label}</label>
      {children}
      {error ? (
        <p className="mt-1 text-xs text-clay">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-ink-faint">{hint}</p>
      ) : null}
    </div>
  );
}
