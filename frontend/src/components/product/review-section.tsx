'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RatingStars } from '@/components/ui/rating-stars';
import { api, ClientApiError } from '@/lib/api-client';
import { buildReviewSchema, type ReviewInput } from '@/schemas/checkout';
import { useAuthStore } from '@/store/auth-store';
import { useI18n } from '@/i18n/provider';
import { fmt, plural } from '@/i18n';
import { cn, formatDate } from '@/lib/utils';
import type { Review } from '@/types';

interface ReviewSectionProps {
  slug: string;
  reviews: Review[];
  ratingAvg: number;
  ratingCount: number;
}

export function ReviewSection({ slug, reviews, ratingAvg, ratingCount }: ReviewSectionProps) {
  const { t, locale } = useI18n();
  const user = useAuthStore((state) => state.user);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ReviewInput>({
    resolver: zodResolver(buildReviewSchema(t)),
    defaultValues: { rating: 5, title: '', body: '' },
  });

  const rating = watch('rating');

  const onSubmit = handleSubmit(async (values) => {
    try {
      await api.post(`/products/${slug}/reviews`, {
        rating: values.rating,
        title: values.title || undefined,
        body: values.body,
      });
      toast.success(t.product.reviewThanks);
      setSubmitted(true);
      setIsFormOpen(false);
    } catch (error) {
      toast.error(error instanceof ClientApiError ? error.message : t.product.reviewFailed);
    }
  });

  return (
    <section className="border-t border-line pt-12" aria-labelledby="reviews-heading">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 id="reviews-heading" className="font-display text-2xl">
            {t.product.reviews}
          </h2>
          {ratingCount > 0 ? (
            <div className="mt-2 flex items-center gap-3">
              <RatingStars value={ratingAvg} label={fmt(t.product.ratedLabel, { value: ratingAvg.toFixed(1) })} />
              <span className="text-xs tabular-nums text-ink-soft">
                {ratingAvg.toFixed(1)} ·{' '}
                {plural(ratingCount, t.product.reviewCountOne, t.product.reviewCountOther, { count: ratingCount })}
              </span>
            </div>
          ) : (
            <p className="mt-2 text-sm text-ink-soft">{t.product.noReviews}</p>
          )}
        </div>

        {user && !submitted && (
          <Button variant="secondary" size="sm" onClick={() => setIsFormOpen((open) => !open)}>
            {isFormOpen ? t.common.cancel : t.product.writeReview}
          </Button>
        )}
      </div>

      {isFormOpen && (
        <form onSubmit={onSubmit} className="mb-10 max-w-xl space-y-4 border border-line bg-surface p-6">
          <fieldset>
            <legend className="eyebrow mb-2">{t.product.yourRating}</legend>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-label={fmt(t.product.ratedLabel, { value })}
                  onClick={() => setValue('rating', value, { shouldValidate: true })}
                  className="p-1"
                >
                  <Star className={cn('size-6', value <= rating ? 'fill-ink text-ink' : 'text-line')} />
                </button>
              ))}
            </div>
          </fieldset>

          <div>
            <label htmlFor="review-title" className="eyebrow mb-1.5 block">
              {t.product.reviewTitle} ({t.common.optional})
            </label>
            <input
              id="review-title"
              {...register('title')}
              className="field"
              placeholder={t.product.reviewTitlePlaceholder}
            />
          </div>

          <div>
            <label htmlFor="review-body" className="eyebrow mb-1.5 block">
              {t.product.reviewBody}
            </label>
            <textarea
              id="review-body"
              rows={4}
              {...register('body')}
              aria-invalid={Boolean(errors.body)}
              className="field resize-none"
              placeholder={t.product.reviewBodyPlaceholder}
            />
            {errors.body && <p className="mt-1 text-xs text-clay">{errors.body.message}</p>}
          </div>

          <Button type="submit" isLoading={isSubmitting}>
            {t.product.publishReview}
          </Button>
          <p className="text-xs text-ink-faint">{t.product.reviewGate}</p>
        </form>
      )}

      {reviews.length > 0 && (
        <ul className="divide-y divide-line">
          {reviews.map((review) => (
            <li key={review.id} className="py-6">
              <div className="flex items-center justify-between gap-4">
                <RatingStars
                  value={review.rating}
                  size={13}
                  label={fmt(t.product.ratedLabel, { value: review.rating })}
                />
                <span className="text-xs text-ink-faint">{formatDate(review.createdAt, locale)}</span>
              </div>
              {review.title && <h3 className="mt-2.5 text-sm">{review.title}</h3>}
              <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{review.body}</p>
              <p className="mt-2 text-xs text-ink-faint">{review.author}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
