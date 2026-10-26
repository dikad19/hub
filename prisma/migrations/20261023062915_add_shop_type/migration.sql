-- CreateEnum
CREATE TYPE "BusinessType" AS ENUM ('RETAIL', 'FNB', 'SERVICE', 'OTHER');

-- AlterTable
ALTER TABLE "Store" ADD COLUMN     "businessType" "BusinessType" NOT NULL DEFAULT 'RETAIL',
ADD COLUMN     "features" TEXT[] DEFAULT ARRAY[]::TEXT[];
