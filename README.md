# Atelier — full-stack clothing store for Google Cloud

A production-shaped e-commerce application for a clothing brand, built to run on
Google Cloud Platform.

| Layer     | Technology                                                  | GCP service              |
| --------- | ----------------------------------------------------------- | ------------------------ |
| Storefront| Next.js 15 (App Router), Tailwind CSS 4, Zustand, Zod, Sonner| Cloud Run                |
| Payments  | Kashier hosted payment page + signed webhook                  | —                        |
| API       | NestJS 11, Prisma 6, Passport JWT                            | Cloud Run                |
| Database  | PostgreSQL 16                                                | Cloud SQL (private IP)   |
| Cache     | Redis 7                                                      | Memorystore for Redis    |
| Media     | Object storage with V4 signed uploads                        | Cloud Storage            |
| Edge      | HTTPS load balancer, CDN, WAF                                | Cloud Load Balancing, Cloud CDN, Cloud Armor |
| Registry  | Container images                                             | Artifact Registry        |
| Secrets   | Database URL, JWT keys, Redis auth                           | Secret Manager           |

## Architecture

```
                        ┌──────────────┐
                        │    Users     │
                        └──────┬───────┘
                               ▼
              ┌────────────────────────────────┐
              │  Global HTTPS Load Balancer    │
              │  Cloud Armor (WAF + rate limit)│
              │  Cloud CDN (static + ISR)      │
              └───────┬────────────────┬───────┘
                /*    │                │  /api/v1/*
                      ▼                ▼
        ┌──────────────────┐   ┌──────────────────┐
        │ Cloud Run — web  │──▶│ Cloud Run — API  │
        │ Next.js, Tailwind│   │ NestJS, Prisma   │
        │ Zustand, Zod     │   │ JWT auth         │
        └──────────────────┘   └────────┬─────────┘
                                        │  Serverless VPC connector
                     ┌──────────────────┼──────────────────┐
                     ▼                  ▼                  ▼
            ┌────────────────┐ ┌────────────────┐ ┌────────────────┐
            │   Cloud SQL    │ │  Memorystore   │ │ Cloud Storage  │
            │ PostgreSQL 16  │ │  Redis cache   │ │ product images │
            │ (+ read replica)│ │ + refresh keys │ │ signed uploads │
            └────────────────┘ └────────────────┘ └────────────────┘
```

It ships bilingual (English / Arabic with full RTL), themed (light / dark /
follow-OS), and with an admin dashboard for products, categories and orders.

Design decisions worth knowing before reading the code:

- **The browser never holds a JWT.** Tokens live in `httpOnly` cookies. Client
  components call a same-origin BFF route (`/api/bff/*`) that attaches the
  access token server-side and silently rotates it on a 401. No CORS, no token
  in `localStorage`.
- **Money is integer minor units** (`priceCents`) end to end. Formatting happens
  once, at render.
- **Prices and stock are never trusted from the client.** Checkout re-prices
  every line from the database and claims stock with a conditional `UPDATE`, so
  two shoppers cannot both buy the last unit.
- **Redis is optional at runtime.** Every cache read degrades to a database
  query; a Memorystore outage slows the site down but does not take it down.
- **The data tier has no public IP.** Cloud SQL and Memorystore are private-only
  and reached through a Serverless VPC Access connector.
- **Payment state has exactly one writer.** The browser redirect back from
  Kashier is never trusted; only the HMAC-verified server-to-server webhook can
  move an order to `PAID`. Every callback is written to `payment_events` first,
  and a unique index on `(provider, transactionId, eventType)` makes replays
  no-ops. A correctly signed callback whose amount does not match the order is
  refused rather than applied.
- **Content is bilingual in the database, not machine-translated at render.**
  Products, categories and colours carry an Arabic column next to the English
  one, and order lines snapshot both — so an Arabic invoice still reads in
  Arabic after a product is renamed.
- **Dark mode flips CSS variables, not utilities.** There is not one `dark:`
  class in the components: `.dark` redefines `--color-paper`, `--color-ink` and
  friends, and every Tailwind utility resolves through those variables.
- **Every environment variable is read through `src/lib/env.ts`.** A Docker
  `ARG` with no value becomes an empty string, and `process.env.X ?? default`
  keeps it — which breaks `new URL('')` and turns `Number('')` into `0`.

Two behaviours that look like details but are not:

- `loading.tsx` lives in `app/[locale]/products/(list)/`, not at the app root. A loading
  boundary makes Next.js stream immediately, which commits the HTTP status
  before the page renders — at the root it turned every `notFound()` into a soft
  200 and every auth `redirect()` into a non-307.
- `tsBuildInfoFile` points inside `dist/`. `nest build` clears `dist/`, so a
  cache left outside it makes `tsc` report "Found 0 errors", emit nothing, and
  produce an image with no `dist/main.js`.

## Repository layout

```
backend/                 NestJS API
  prisma/schema.prisma   Data model (users, products, variants, carts, orders, reviews)
  prisma/seed.ts         Demo catalogue and accounts
  src/common/            Prisma, Redis, Storage, guards, filters, DTOs
  src/modules/           auth, users, categories, products, cart, orders,
                         reviews, uploads, payments (Kashier), admin, health
frontend/                Next.js storefront
  src/app/[locale]/      Every page, under /en or /ar
  src/app/[locale]/admin/  Dashboard: overview, products, categories, orders
  src/app/api/           BFF proxy and auth cookie handlers (locale-free)
  src/middleware.ts      Locale detection and redirect
  src/i18n/              Dictionaries, provider, locale-aware Link
  src/components/        Layout, product, cart, admin, payment, form, UI
  src/lib/               Server fetch, client fetch, session, queries, env, labels
  src/schemas/           Zod schemas, built from the active dictionary
  src/store/             Zustand stores (cart, auth)
infra/terraform/         VPC, Cloud SQL, Memorystore, GCS, Cloud Run, LB/CDN/Armor, IAM
.github/workflows/       CI (typecheck, build, test) and Cloud Run deployment
docker-compose.yml       Local stack mirroring the GCP topology
```

## Running locally

Requires Node 22+ and Docker.

```bash
make setup
```

Then either run everything in containers:

```bash
make up
```

…or run only the data services in Docker and the apps on the host, which gives a
faster feedback loop:

```bash
make infra
make migrate name=init
make seed
make dev-api    # http://localhost:8080/api/v1  (Swagger at /api/v1/docs)
make dev-web    # http://localhost:3000
```

Seeded accounts:

| Role     | Email                    | Password       |
| -------- | ------------------------ | -------------- |
| Admin    | `admin@atelier.test`     | `Admin123!`    |
| Customer | `customer@atelier.test`  | `Customer123!` |

## API surface

All routes are prefixed with `/api/v1`.

| Method | Path                          | Access   | Purpose                                  |
| ------ | ----------------------------- | -------- | ---------------------------------------- |
| POST   | `/auth/register`              | public   | Create an account, returns a token pair   |
| POST   | `/auth/login`                 | public   | Sign in                                   |
| POST   | `/auth/refresh`               | public   | Rotate a refresh token                    |
| POST   | `/auth/logout`                | public   | Revoke the presented refresh token        |
| GET    | `/auth/me`                    | customer | Current profile                           |
| GET    | `/products`                   | public   | Search, filter, sort, paginate            |
| GET    | `/products/featured`          | public   | Homepage edit                             |
| GET    | `/products/filters`           | public   | Sizes, colours, price range for the facets|
| GET    | `/products/:slug`             | public   | Detail with variants and related items    |
| POST   | `/products`                   | admin    | Create with images and variants           |
| PATCH  | `/products/:id`               | admin    | Update (images/variants replaced wholesale)|
| GET    | `/categories`                 | public   | Category tree with product counts         |
| GET    | `/cart`                       | customer | Server cart with live prices and stock    |
| PUT    | `/cart`                       | customer | Replace cart contents                     |
| POST   | `/cart/merge`                 | customer | Merge a guest cart on sign-in             |
| POST   | `/orders`                     | customer | Checkout                                  |
| GET    | `/orders`                     | customer | Order history                             |
| PATCH  | `/orders/:id/cancel`          | customer | Cancel and restock                        |
| PATCH  | `/orders/:id/status`          | admin    | Move through fulfilment                   |
| GET    | `/products/:slug/reviews`     | public   | Reviews                                   |
| POST   | `/products/:slug/reviews`     | customer | Review a shipped purchase                 |
| POST   | `/uploads/signed-url`         | admin    | Mint a V4 signed PUT URL for GCS          |
| GET    | `/payments/methods`           | public   | Which methods this environment can offer  |
| POST   | `/payments/kashier/session/:id`| customer| Create a hosted-payment-page session      |
| POST   | `/payments/kashier/webhook`   | public   | Signed gateway callback (sole writer of PAID) |
| GET    | `/payments/kashier/reconcile` | customer | Read order state back after the redirect  |
| GET    | `/admin/stats`                | admin    | Revenue, daily chart, low stock, best sellers |
| GET    | `/admin/products`             | admin    | Catalogue listing including inactive rows |
| GET    | `/health`, `/health/ready`    | public   | Cloud Run probes                          |

Swagger UI is served at `/api/v1/docs` outside production.

## Languages and theming

Every page lives under `/en` or `/ar`. `src/middleware.ts` resolves the locale
from the cookie, then `Accept-Language`, then falls back to English, and
redirects unprefixed paths. The layout sets `lang` and `dir`, so Arabic renders
right-to-left with no per-component work — layout code uses logical properties
(`start`/`end`, `ms`/`me`) rather than left/right.

Translations live in two files. `src/i18n/messages/en.ts` is the source, and
`ar.ts` is typed against it, so **a missing Arabic key fails the build** rather
than silently rendering English. Interpolation uses `{token}` placeholders and
the `fmt()` helper — the dictionary crosses the server/client boundary and so
must stay JSON-serialisable.

Theme is light / dark / follow-OS. An inline script in `<head>` applies the
saved choice before first paint (no flash), and the preference is mirrored into
both `localStorage` and a cookie.

## Catalogue imagery

The seed uses real garment photography from Unsplash, referenced by photo id in
`backend/prisma/seed.ts`. Only the id is stored — crop, size and format are
query parameters, so one source photo serves the 3:4 product shot, the square
category tile and the wide hero.

The Unsplash License allows commercial use without attribution, which is why
these are safe to ship as demo data. **Do not replace them with images taken
from a retailer's website**: product photography is copyrighted, and a store
that ships someone else's shots is a takedown waiting to happen. For real
inventory, upload through the admin — those land in Cloud Storage via a signed
URL and are served from your own bucket.

`next.config.ts` allow-lists exactly two image hosts: your Cloud Storage bucket
and `images.unsplash.com`. Adding a third means adding it there too, otherwise
`next/image` refuses to optimise it.

## Kashier payments

Set these on the API and card payment appears at checkout automatically; leave
`KASHIER_MERCHANT_ID` empty and the storefront offers cash on delivery only.

```bash
KASHIER_MERCHANT_ID=MID-xxxx
KASHIER_API_KEY=...
KASHIER_SECRET_KEY=...      # only if Kashier issued a separate secret key
KASHIER_MODE=test           # or live
STOREFRONT_URL=https://shop.example.com
API_PUBLIC_URL=https://api.example.com/api/v1
```

The flow:

1. Checkout creates the order (stock is reserved at this point) and calls
   `POST /payments/kashier/session/:orderId`.
2. The API signs `\/?payment=<mid>.<orderNumber>.<amount>.<currency>` with the
   API key and returns a hosted-payment-page URL. Editing the amount in that URL
   invalidates the hash, so Kashier rejects it.
3. The shopper pays and is redirected to `/{locale}/checkout/callback`. That page
   only *reads* order state — it never marks anything paid.
4. Kashier posts to `POST /payments/kashier/webhook`. The signature is
   recomputed from the `signatureKeys` the payload names, compared in constant
   time, the amount is checked against the order, and only then does the order
   become `PAID`.

`KASHIER_MODE=test` uses Kashier's test merchant, so no real money moves. The
signature logic has unit tests (`npm test` in `backend/`) covering forged
signatures, edited amounts and reordered keys — those run without touching the
gateway.

## Admin dashboard

`/{locale}/admin`, restricted to users with the `ADMIN` role:

- **Overview** — revenue, order count, average order value, customers, a 30-day
  revenue chart, orders by status, best sellers and low-stock alerts.
- **Products** — searchable table including deactivated rows, with a full
  create/edit form covering both languages, images, and per-variant stock.
  Deleting deactivates rather than destroys, so order history stays intact.
- **Categories** — inline CRUD; a category with products cannot be deleted.
- **Orders** — filter by status and move an order through the pipeline.
  Cancelling or refunding restocks its items automatically.

The layout check is defence in depth: every admin endpoint independently
enforces the `ADMIN` role, so bypassing the UI gains nothing.

## Deploying to GCP

### 1. Provision the infrastructure

```bash
cd infra/terraform
cp terraform.tfvars.example terraform.tfvars   # set project_id at minimum
terraform init
terraform apply
```

The first apply deploys both Cloud Run services with a placeholder image so the
service URLs exist. Terraform ignores subsequent image changes, so CI owns the
running revision from that point on.

### 2. Run the first migration

Cloud SQL has no public IP, so connect through the Cloud SQL Auth Proxy:

```bash
cloud-sql-proxy --port 5432 "$(terraform -chdir=infra/terraform output -raw database_instance)" &

cd backend
DATABASE_URL="postgresql://atelier_app:$(terraform -chdir=../infra/terraform output -raw database_password)@127.0.0.1:5432/atelier?schema=public" \
  npx prisma migrate deploy
```

Seed the demo catalogue the same way with `npm run db:seed`.

### 3. Wire up CI/CD

Create a Workload Identity pool and provider for the repository, bind it to the
`*-deployer` service account from `terraform output deployer_service_account`,
then set these repository secrets:

| Secret                     | Value                                              |
| -------------------------- | -------------------------------------------------- |
| `WIF_PROVIDER`             | Full provider resource name                        |
| `DEPLOYER_SA`              | `terraform output deployer_service_account`         |
| `GCP_PROJECT_ID`           | Project id                                          |
| `CLOUDSQL_CONNECTION_NAME` | `terraform output database_instance`                |
| `MIGRATION_DATABASE_URL`   | Proxy connection string used by the migration step  |
| `SITE_URL`                 | Public storefront URL                               |
| `GCS_BUCKET`               | `terraform output media_bucket`                     |

Pushing to `main` then builds both images, runs `prisma migrate deploy`, deploys
both services and smoke-tests them.

### 4. Turn on the edge

Set `custom_domain` and `enable_load_balancer = true`, apply, and point an `A`
record at `terraform output load_balancer_ip`. Once the managed certificate
reports `ACTIVE`, set `lb_only_ingress = true` and apply again — this closes the
`run.app` URLs so all traffic must pass through Cloud Armor.

## Cost and scaling notes

- `backend_min_instances = 1` keeps one warm API instance, which removes a
  ~2 second cold start from the first checkout of the day. Set it to `0` for a
  demo environment.
- Each Cloud Run instance opens its own PostgreSQL pool. Keep
  `backend_max_instances × pool size` below the instance's `max_connections`
  (currently 200); raise the tier before raising the ceiling.
- `db-g1-small` and a 1 GB `BASIC` Memorystore are pilot sizing. For real
  traffic move to `db-custom-2-7680`, `REGIONAL` availability and
  `STANDARD_HA` Redis.
- Rate limiting inside NestJS is per-instance, so it is a burst guard only.
  Cloud Armor is the real quota.
- The root layout reads the session cookie, so every HTML route is rendered on
  demand. Cloud CDN therefore caches `/_next/static/*` rather than pages, and
  the catalogue is kept off the database by two other layers: the Next.js data
  cache (`revalidate: 60`) and Redis inside the API. To make product pages
  CDN-cacheable as well, move the session read out of the layout and into the
  components that actually need it.

## Known gaps

These are deliberate scope boundaries, not oversights:

- **Payments** stop at cash on delivery. `Order.paymentMethod`/`paymentRef` and
  the `PAID` status already model a gateway; wiring Paymob or Stripe means one
  webhook controller that flips the status.
- **Transactional email** (order confirmation) is not implemented.
- **The admin UI** is not built — product, category and order management are
  exposed as admin-only API routes with Swagger docs.
