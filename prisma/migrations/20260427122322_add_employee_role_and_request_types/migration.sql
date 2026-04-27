-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AdminRequestType" ADD VALUE 'EDIT_PRODUCT';
ALTER TYPE "AdminRequestType" ADD VALUE 'DELETE_PRODUCT';
ALTER TYPE "AdminRequestType" ADD VALUE 'UPDATE_ORDER_STATUS';

-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'EMPLOYEE';

-- AlterTable
ALTER TABLE "AdminRequest" ADD COLUMN     "payload" JSONB,
ADD COLUMN     "targetOrderId" TEXT,
ADD COLUMN     "targetProductId" TEXT,
ALTER COLUMN "targetUserId" DROP NOT NULL;
