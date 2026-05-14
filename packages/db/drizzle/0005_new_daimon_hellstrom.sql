CREATE TYPE "public"."AbandonedCartStatus" AS ENUM('ACTIVE', 'CONVERTED');--> statement-breakpoint
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
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "AbandonedCart" ADD CONSTRAINT "AbandonedCart_restaurantId_Restaurant_id_fk" FOREIGN KEY ("restaurantId") REFERENCES "public"."Restaurant"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "AbandonedCart" ADD CONSTRAINT "AbandonedCart_convertedOrderId_Order_id_fk" FOREIGN KEY ("convertedOrderId") REFERENCES "public"."Order"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "abandoned_cart_restaurant_session_unique" ON "AbandonedCart" USING btree ("restaurantId","sessionId");