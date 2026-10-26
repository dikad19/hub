/*
  Warnings:

  - You are about to drop the column `trackStock` on the `ProductVariant` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[storeId,parentId,name]` on the table `Category` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "StockMode" AS ENUM ('NONE', 'DIRECT', 'RECIPE');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "StockMovementType" ADD VALUE 'CONSUMPTION';
ALTER TYPE "StockMovementType" ADD VALUE 'CONSUMPTION_VOID';

-- DropIndex
DROP INDEX "Category_storeId_idx";

-- DropIndex
DROP INDEX "Category_storeId_name_key";

-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "parentId" TEXT,
ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "ProductVariant" DROP COLUMN "trackStock",
ADD COLUMN     "isSellable" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "stockMode" "StockMode" NOT NULL DEFAULT 'DIRECT';

-- CreateTable
CREATE TABLE "RecipeItem" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "menuVariantId" TEXT NOT NULL,
    "ingredientVariantId" TEXT NOT NULL,
    "qty" DECIMAL(14,3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecipeItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RecipeItem_storeId_idx" ON "RecipeItem"("storeId");

-- CreateIndex
CREATE INDEX "RecipeItem_ingredientVariantId_idx" ON "RecipeItem"("ingredientVariantId");

-- CreateIndex
CREATE UNIQUE INDEX "RecipeItem_menuVariantId_ingredientVariantId_key" ON "RecipeItem"("menuVariantId", "ingredientVariantId");

-- CreateIndex
CREATE INDEX "Category_storeId_parentId_idx" ON "Category"("storeId", "parentId");

-- CreateIndex
CREATE UNIQUE INDEX "Category_storeId_parentId_name_key" ON "Category"("storeId", "parentId", "name");

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipeItem" ADD CONSTRAINT "RecipeItem_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipeItem" ADD CONSTRAINT "RecipeItem_menuVariantId_fkey" FOREIGN KEY ("menuVariantId") REFERENCES "ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipeItem" ADD CONSTRAINT "RecipeItem_ingredientVariantId_fkey" FOREIGN KEY ("ingredientVariantId") REFERENCES "ProductVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
