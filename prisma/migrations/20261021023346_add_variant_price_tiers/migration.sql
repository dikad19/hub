-- CreateTable
CREATE TABLE "VariantPriceTier" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "minQty" DECIMAL(14,3) NOT NULL,
    "price" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VariantPriceTier_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VariantPriceTier_storeId_idx" ON "VariantPriceTier"("storeId");

-- CreateIndex
CREATE UNIQUE INDEX "VariantPriceTier_variantId_minQty_key" ON "VariantPriceTier"("variantId", "minQty");

-- AddForeignKey
ALTER TABLE "VariantPriceTier" ADD CONSTRAINT "VariantPriceTier_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VariantPriceTier" ADD CONSTRAINT "VariantPriceTier_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
