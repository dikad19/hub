/*
  Warnings:

  - You are about to drop the column `saleId` on the `CustomerPayment` table. All the data in the column will be lost.
  - You are about to drop the column `paymentMethod` on the `Sale` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[saleReturnId]` on the table `CashMovement` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "RefundMethod" AS ENUM ('CASH', 'QRIS', 'TRANSFER', 'OTHER', 'CREDIT_OFFSET');

-- DropForeignKey
ALTER TABLE "CustomerPayment" DROP CONSTRAINT "CustomerPayment_saleId_fkey";

-- DropIndex
DROP INDEX "CustomerPayment_saleId_idx";

-- AlterTable
ALTER TABLE "CashMovement" ADD COLUMN     "saleReturnId" TEXT;

-- AlterTable
ALTER TABLE "CustomerPayment" DROP COLUMN "saleId",
ADD COLUMN     "voidReason" TEXT,
ADD COLUMN     "voidedById" TEXT;

-- AlterTable
ALTER TABLE "Sale" DROP COLUMN "paymentMethod";

-- AlterTable
ALTER TABLE "StockMovement" ADD COLUMN     "saleReturnId" TEXT;

-- AlterTable
ALTER TABLE "Store" ADD COLUMN     "returnCounter" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "SalePayment" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "amount" INTEGER NOT NULL,
    "reference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalePayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SaleReturn" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "returnNo" INTEGER NOT NULL,
    "customerId" TEXT,
    "total" INTEGER NOT NULL,
    "refundMethod" "RefundMethod" NOT NULL,
    "refundAmount" INTEGER NOT NULL DEFAULT 0,
    "creditOffset" INTEGER NOT NULL DEFAULT 0,
    "reason" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SaleReturn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SaleReturnItem" (
    "id" TEXT NOT NULL,
    "returnId" TEXT NOT NULL,
    "saleItemId" TEXT NOT NULL,
    "variantId" TEXT,
    "qty" DECIMAL(14,3) NOT NULL,
    "lineTotal" INTEGER NOT NULL,
    "costTotal" INTEGER NOT NULL,
    "restock" BOOLEAN NOT NULL DEFAULT true,
    "reason" TEXT,

    CONSTRAINT "SaleReturnItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SalePayment_saleId_idx" ON "SalePayment"("saleId");

-- CreateIndex
CREATE INDEX "SalePayment_storeId_method_createdAt_idx" ON "SalePayment"("storeId", "method", "createdAt");

-- CreateIndex
CREATE INDEX "SaleReturn_storeId_createdAt_idx" ON "SaleReturn"("storeId", "createdAt");

-- CreateIndex
CREATE INDEX "SaleReturn_saleId_idx" ON "SaleReturn"("saleId");

-- CreateIndex
CREATE UNIQUE INDEX "SaleReturn_storeId_returnNo_key" ON "SaleReturn"("storeId", "returnNo");

-- CreateIndex
CREATE INDEX "SaleReturnItem_returnId_idx" ON "SaleReturnItem"("returnId");

-- CreateIndex
CREATE INDEX "SaleReturnItem_saleItemId_idx" ON "SaleReturnItem"("saleItemId");

-- CreateIndex
CREATE UNIQUE INDEX "CashMovement_saleReturnId_key" ON "CashMovement"("saleReturnId");

-- CreateIndex
CREATE INDEX "StockMovement_saleReturnId_idx" ON "StockMovement"("saleReturnId");

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_saleReturnId_fkey" FOREIGN KEY ("saleReturnId") REFERENCES "SaleReturn"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashMovement" ADD CONSTRAINT "CashMovement_saleReturnId_fkey" FOREIGN KEY ("saleReturnId") REFERENCES "SaleReturn"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalePayment" ADD CONSTRAINT "SalePayment_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalePayment" ADD CONSTRAINT "SalePayment_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleReturn" ADD CONSTRAINT "SaleReturn_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleReturn" ADD CONSTRAINT "SaleReturn_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleReturn" ADD CONSTRAINT "SaleReturn_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleReturnItem" ADD CONSTRAINT "SaleReturnItem_returnId_fkey" FOREIGN KEY ("returnId") REFERENCES "SaleReturn"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleReturnItem" ADD CONSTRAINT "SaleReturnItem_saleItemId_fkey" FOREIGN KEY ("saleItemId") REFERENCES "SaleItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
