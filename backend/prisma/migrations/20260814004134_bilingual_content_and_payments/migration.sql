-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('UNPAID', 'AWAITING_PAYMENT', 'PAID', 'FAILED', 'REFUNDED');

-- AlterTable
ALTER TABLE "categories" ADD COLUMN     "descriptionAr" TEXT,
ADD COLUMN     "nameAr" TEXT;

-- AlterTable
ALTER TABLE "order_items" ADD COLUMN     "colorAr" TEXT,
ADD COLUMN     "productNameAr" TEXT;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "paidAt" TIMESTAMP(3),
ADD COLUMN     "paymentProvider" TEXT,
ADD COLUMN     "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'UNPAID';

-- AlterTable
ALTER TABLE "product_variants" ADD COLUMN     "colorAr" TEXT;

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "careAr" TEXT,
ADD COLUMN     "descriptionAr" TEXT,
ADD COLUMN     "materialAr" TEXT,
ADD COLUMN     "nameAr" TEXT;

-- CreateTable
CREATE TABLE "payment_events" (
    "id" TEXT NOT NULL,
    "orderId" TEXT,
    "provider" TEXT NOT NULL DEFAULT 'kashier',
    "eventType" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "amountCents" INTEGER,
    "currency" TEXT,
    "signatureOk" BOOLEAN NOT NULL DEFAULT false,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "payment_events_orderId_idx" ON "payment_events"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "payment_events_provider_transactionId_eventType_key" ON "payment_events"("provider", "transactionId", "eventType");

-- AddForeignKey
ALTER TABLE "payment_events" ADD CONSTRAINT "payment_events_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
