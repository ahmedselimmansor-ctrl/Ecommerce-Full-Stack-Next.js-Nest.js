import { z } from 'zod';
import type { Dictionary } from '@/i18n';

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Admin product form.
 *
 * Prices are entered in major units (`1450.00`) because that is what a merchant
 * thinks in; the form converts to minor units before sending, so the API still
 * only ever sees integers.
 */
export function buildProductSchema(t: Dictionary) {
  return z
    .object({
      name: z.string().trim().min(2, t.validation.nameMin).max(120),
      nameAr: z.string().trim().max(120).optional().or(z.literal('')),
      slug: z.string().trim().toLowerCase().regex(SLUG_PATTERN, t.validation.slugFormat),
      description: z.string().trim().min(10, t.validation.descriptionMin).max(4000),
      descriptionAr: z.string().trim().max(4000).optional().or(z.literal('')),
      price: z.coerce.number().positive(t.validation.pricePositive),
      compareAt: z.union([z.coerce.number().nonnegative(), z.literal('')]).optional(),
      categoryId: z.string().min(1, t.validation.categoryRequired),
      gender: z.enum(['MEN', 'WOMEN', 'UNISEX', 'KIDS']),
      material: z.string().trim().max(200).optional().or(z.literal('')),
      materialAr: z.string().trim().max(200).optional().or(z.literal('')),
      care: z.string().trim().max(400).optional().or(z.literal('')),
      careAr: z.string().trim().max(400).optional().or(z.literal('')),
      isActive: z.boolean(),
      isFeatured: z.boolean(),
      images: z
        .array(
          z.object({
            url: z.string().trim().url(t.validation.urlInvalid),
            alt: z.string().trim().max(200).optional().or(z.literal('')),
          }),
        )
        .min(1, t.admin.needImage),
      variants: z
        .array(
          z.object({
            sku: z.string().trim().min(2, t.validation.skuRequired).max(60),
            size: z.string().trim().min(1).max(20),
            color: z.string().trim().min(1).max(40),
            colorAr: z.string().trim().max(40).optional().or(z.literal('')),
            colorHex: z.string().trim().max(9).optional().or(z.literal('')),
            stock: z.coerce.number().int().nonnegative(t.validation.stockPositive),
          }),
        )
        .min(1, t.admin.needVariant),
    })
    // A duplicate SKU would silently overwrite another variant on upsert, so it
    // is caught here rather than surfacing as a confusing 409.
    .superRefine((values, ctx) => {
      const seen = new Set<string>();
      values.variants.forEach((variant, index) => {
        const sku = variant.sku.trim().toUpperCase();
        if (seen.has(sku)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['variants', index, 'sku'],
            message: t.admin.duplicateSku.replace('{sku}', variant.sku),
          });
        }
        seen.add(sku);
      });
    });
}

export function buildCategorySchema(t: Dictionary) {
  return z.object({
    name: z.string().trim().min(2, t.validation.nameMin).max(80),
    nameAr: z.string().trim().max(80).optional().or(z.literal('')),
    slug: z.string().trim().toLowerCase().regex(SLUG_PATTERN, t.validation.slugFormat),
    description: z.string().trim().max(500).optional().or(z.literal('')),
    descriptionAr: z.string().trim().max(500).optional().or(z.literal('')),
    imageUrl: z.union([z.string().trim().url(t.validation.urlInvalid), z.literal('')]).optional(),
  });
}

export type ProductFormInput = z.infer<ReturnType<typeof buildProductSchema>>;
export type CategoryFormInput = z.infer<ReturnType<typeof buildCategorySchema>>;
