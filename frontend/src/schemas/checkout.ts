import { z } from 'zod';
import type { Dictionary } from '@/i18n';
import type { Locale } from '@/i18n/config';

/** Governorates with an Arabic label, so the select reads correctly in both. */
export const EGYPT_GOVERNORATES: { value: string; en: string; ar: string }[] = [
  { value: 'Cairo', en: 'Cairo', ar: 'القاهرة' },
  { value: 'Giza', en: 'Giza', ar: 'الجيزة' },
  { value: 'Alexandria', en: 'Alexandria', ar: 'الإسكندرية' },
  { value: 'Dakahlia', en: 'Dakahlia', ar: 'الدقهلية' },
  { value: 'Sharqia', en: 'Sharqia', ar: 'الشرقية' },
  { value: 'Qalyubia', en: 'Qalyubia', ar: 'القليوبية' },
  { value: 'Beheira', en: 'Beheira', ar: 'البحيرة' },
  { value: 'Gharbia', en: 'Gharbia', ar: 'الغربية' },
  { value: 'Port Said', en: 'Port Said', ar: 'بورسعيد' },
  { value: 'Damietta', en: 'Damietta', ar: 'دمياط' },
  { value: 'Ismailia', en: 'Ismailia', ar: 'الإسماعيلية' },
  { value: 'Suez', en: 'Suez', ar: 'السويس' },
  { value: 'Monufia', en: 'Monufia', ar: 'المنوفية' },
  { value: 'Minya', en: 'Minya', ar: 'المنيا' },
  { value: 'Assiut', en: 'Assiut', ar: 'أسيوط' },
  { value: 'Sohag', en: 'Sohag', ar: 'سوهاج' },
  { value: 'Qena', en: 'Qena', ar: 'قنا' },
  { value: 'Aswan', en: 'Aswan', ar: 'أسوان' },
  { value: 'Luxor', en: 'Luxor', ar: 'الأقصر' },
  { value: 'Red Sea', en: 'Red Sea', ar: 'البحر الأحمر' },
  { value: 'Beni Suef', en: 'Beni Suef', ar: 'بني سويف' },
  { value: 'Fayoum', en: 'Fayoum', ar: 'الفيوم' },
  { value: 'Kafr El Sheikh', en: 'Kafr El Sheikh', ar: 'كفر الشيخ' },
  { value: 'Matrouh', en: 'Matrouh', ar: 'مطروح' },
  { value: 'New Valley', en: 'New Valley', ar: 'الوادي الجديد' },
  { value: 'North Sinai', en: 'North Sinai', ar: 'شمال سيناء' },
  { value: 'South Sinai', en: 'South Sinai', ar: 'جنوب سيناء' },
];

export function governorateLabel(entry: (typeof EGYPT_GOVERNORATES)[number], locale: Locale): string {
  return locale === 'ar' ? entry.ar : entry.en;
}

export function buildCheckoutSchema(t: Dictionary) {
  return z.object({
    fullName: z.string().trim().min(3, t.validation.fullNameMin).max(100),
    phone: z
      .string()
      .trim()
      // Egyptian mobile numbers, with or without the +2 country prefix.
      .regex(/^(\+?2)?01[0-25]\d{8}$/, t.validation.phoneEgypt),
    line1: z.string().trim().min(3, t.validation.addressRequired).max(150),
    line2: z.string().trim().max(150).optional().or(z.literal('')),
    city: z.string().trim().min(2, t.validation.cityRequired).max(80),
    state: z.string().trim().min(2, t.validation.governorateRequired).max(80),
    postalCode: z.string().trim().max(20).optional().or(z.literal('')),
    paymentMethod: z.enum(['CASH_ON_DELIVERY', 'CARD'], {
      errorMap: () => ({ message: t.validation.paymentMethodRequired }),
    }),
    notes: z.string().trim().max(500, t.validation.notesMax).optional().or(z.literal('')),
  });
}

export function buildReviewSchema(t: Dictionary) {
  return z.object({
    rating: z.coerce.number().int().min(1, t.validation.ratingRequired).max(5),
    title: z.string().trim().max(100).optional().or(z.literal('')),
    body: z.string().trim().min(10, t.validation.reviewMin).max(1000),
  });
}

export function buildProfileSchema(t: Dictionary) {
  return z.object({
    firstName: z.string().trim().min(2, t.validation.firstNameMin).max(50),
    lastName: z.string().trim().min(2, t.validation.lastNameMin).max(50),
    phone: z
      .string()
      .trim()
      .regex(/^[+\d][\d\s-]{6,19}$/, t.validation.phoneInvalid)
      .optional()
      .or(z.literal('')),
  });
}

export type CheckoutInput = z.infer<ReturnType<typeof buildCheckoutSchema>>;
export type ReviewInput = z.infer<ReturnType<typeof buildReviewSchema>>;
export type ProfileInput = z.infer<ReturnType<typeof buildProfileSchema>>;
