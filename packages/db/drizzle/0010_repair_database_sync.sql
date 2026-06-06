-- Migration: 0010_repair_database_sync
-- Created manually to fix production sync issues where columns from earlier migrations might be missing.

DO $$ 
BEGIN
    -- 1. Ensure Enums
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CouponDiscountType') THEN
        CREATE TYPE "public"."CouponDiscountType" AS ENUM('PERCENTAGE', 'FIXED');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AbandonedCartStatus') THEN
        CREATE TYPE "public"."AbandonedCartStatus" AS ENUM('ACTIVE', 'CONVERTED');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TransactionStatus') THEN
        CREATE TYPE "public"."TransactionStatus" AS ENUM('PENDING', 'PAID', 'CANCELLED');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TransactionType') THEN
        CREATE TYPE "public"."TransactionType" AS ENUM('REVENUE', 'EXPENSE');
    END IF;

    -- 2. Repair "Order" Table
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Order' AND column_name='couponDiscountAmount') THEN
        ALTER TABLE "Order" ADD COLUMN "couponDiscountAmount" double precision DEFAULT 0 NOT NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Order' AND column_name='cashbackRedeemedAmount') THEN
        ALTER TABLE "Order" ADD COLUMN "cashbackRedeemedAmount" double precision DEFAULT 0 NOT NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Order' AND column_name='cashbackEarnedAmount') THEN
        ALTER TABLE "Order" ADD COLUMN "cashbackEarnedAmount" double precision DEFAULT 0 NOT NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Order' AND column_name='couponId') THEN
        ALTER TABLE "Order" ADD COLUMN "couponId" uuid;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Order' AND column_name='couponCode') THEN
        ALTER TABLE "Order" ADD COLUMN "couponCode" text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Order' AND column_name='cashbackCreditedAt') THEN
        ALTER TABLE "Order" ADD COLUMN "cashbackCreditedAt" timestamp;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Order' AND column_name='courierId') THEN
        ALTER TABLE "Order" ADD COLUMN "courierId" uuid;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Order' AND column_name='dispatchedAt') THEN
        ALTER TABLE "Order" ADD COLUMN "dispatchedAt" timestamp;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Order' AND column_name='deliveredAt') THEN
        ALTER TABLE "Order" ADD COLUMN "deliveredAt" timestamp;
    END IF;

    -- 3. Repair "Product" Table
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Product' AND column_name='ncm') THEN
        ALTER TABLE "Product" ADD COLUMN "ncm" text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Product' AND column_name='cfop') THEN
        ALTER TABLE "Product" ADD COLUMN "cfop" text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Product' AND column_name='csosn') THEN
        ALTER TABLE "Product" ADD COLUMN "csosn" text;
    END IF;

    -- 4. Ensure Tables Exist
    CREATE TABLE IF NOT EXISTS "Coupon" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "code" text NOT NULL,
        "description" text,
        "isActive" boolean DEFAULT true NOT NULL,
        "discountType" "CouponDiscountType" NOT NULL,
        "discountValue" double precision NOT NULL,
        "minimumOrderValue" double precision DEFAULT 0 NOT NULL,
        "maxDiscountAmount" double precision,
        "usageLimit" integer,
        "usageCount" integer DEFAULT 0 NOT NULL,
        "perCustomerLimit" integer DEFAULT 1 NOT NULL,
        "startsAt" timestamp,
        "endsAt" timestamp,
        "restaurantId" uuid NOT NULL,
        "createdAt" timestamp DEFAULT now() NOT NULL,
        "updatedAt" timestamp DEFAULT now() NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "Wallet" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "restaurantId" uuid NOT NULL,
        "customerPhone" text NOT NULL,
        "balance" double precision DEFAULT 0 NOT NULL,
        "totalEarned" double precision DEFAULT 0 NOT NULL,
        "totalRedeemed" double precision DEFAULT 0 NOT NULL,
        "lastCreditAt" timestamp,
        "lastRedeemAt" timestamp,
        "createdAt" timestamp DEFAULT now() NOT NULL,
        "updatedAt" timestamp DEFAULT now() NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "AbandonedCart" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "sessionId" text NOT NULL,
        "status" "AbandonedCartStatus" DEFAULT 'ACTIVE' NOT NULL,
        "restaurantId" uuid NOT NULL,
        "customerName" text,
        "customerPhone" text,
        "consumptionMethod" "ConsumptionMethod" NOT NULL,
        "paymentMethod" "PaymentMethod",
        "couponCode" text,
        "useWalletBalance" boolean DEFAULT false NOT NULL,
        "scheduledFor" timestamp,
        "subtotal" double precision DEFAULT 0 NOT NULL,
        "total" double precision DEFAULT 0 NOT NULL,
        "itemCount" integer DEFAULT 0 NOT NULL,
        "cartSnapshot" jsonb NOT NULL,
        "convertedOrderId" integer,
        "convertedAt" timestamp,
        "createdAt" timestamp DEFAULT now() NOT NULL,
        "updatedAt" timestamp DEFAULT now() NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "Courier" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "name" text NOT NULL,
        "phone" text NOT NULL,
        "vehicleType" text,
        "licensePlate" text,
        "isActive" boolean DEFAULT true NOT NULL,
        "restaurantId" uuid NOT NULL,
        "createdAt" timestamp DEFAULT now() NOT NULL,
        "updatedAt" timestamp DEFAULT now() NOT NULL
    );

END $$;
