CREATE TYPE "public"."CouponDiscountType" AS ENUM('PERCENTAGE', 'FIXED');--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
ALTER TABLE "Order" ADD COLUMN "couponDiscountAmount" double precision DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "Order" ADD COLUMN "cashbackRedeemedAmount" double precision DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "Order" ADD COLUMN "cashbackEarnedAmount" double precision DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "Order" ADD COLUMN "couponId" uuid;--> statement-breakpoint
ALTER TABLE "Order" ADD COLUMN "couponCode" text;--> statement-breakpoint
ALTER TABLE "Order" ADD COLUMN "cashbackCreditedAt" timestamp;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Coupon" ADD CONSTRAINT "Coupon_restaurantId_Restaurant_id_fk" FOREIGN KEY ("restaurantId") REFERENCES "public"."Restaurant"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_restaurantId_Restaurant_id_fk" FOREIGN KEY ("restaurantId") REFERENCES "public"."Restaurant"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "coupon_restaurant_code_unique" ON "Coupon" USING btree ("restaurantId","code");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "wallet_restaurant_phone_unique" ON "Wallet" USING btree ("restaurantId","customerPhone");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Order" ADD CONSTRAINT "Order_couponId_Coupon_id_fk" FOREIGN KEY ("couponId") REFERENCES "public"."Coupon"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
