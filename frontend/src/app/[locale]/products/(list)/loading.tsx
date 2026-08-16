/**
 * Skeleton for the catalogue listing.
 *
 * It lives inside the `(list)` route group on purpose. A loading boundary makes
 * Next.js start streaming immediately, which commits the HTTP status before the
 * page finishes rendering — so a boundary placed higher up would turn
 * `notFound()` on /products/[slug] into a soft 200.
 */
export default function ProductsLoading() {
  return (
    <div className="container-page py-10" aria-busy="true" aria-label="Loading products">
      <div className="mb-10 space-y-3">
        <div className="h-3 w-20 animate-pulse bg-paper-dim" />
        <div className="h-9 w-64 animate-pulse bg-paper-dim" />
      </div>

      <div className="grid gap-10 lg:grid-cols-[220px_1fr]">
        <div className="hidden space-y-6 lg:block">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="space-y-2 border-t border-line pt-5">
              <div className="h-3 w-16 animate-pulse bg-paper-dim" />
              <div className="h-3 w-full animate-pulse bg-paper-dim" />
              <div className="h-3 w-2/3 animate-pulse bg-paper-dim" />
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="space-y-3">
              <div className="aspect-portrait animate-pulse bg-paper-dim" />
              <div className="h-3 w-2/3 animate-pulse bg-paper-dim" />
              <div className="h-3 w-1/3 animate-pulse bg-paper-dim" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
