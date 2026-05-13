CREATE TYPE "public"."PaymentStatus" AS ENUM('PENDING', 'PAID', 'FAILED', 'REFUNDED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."StockMovementType" AS ENUM('IN', 'OUT', 'ADJUSTMENT');--> statement-breakpoint
ALTER TYPE "public"."ConsumptionMethod" ADD VALUE 'DELIVERY';--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "FinancialClosing" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"restaurantId" uuid NOT NULL,
	"referenceDate" date NOT NULL,
	"grossRevenue" double precision DEFAULT 0 NOT NULL,
	"estimatedCost" double precision DEFAULT 0 NOT NULL,
	"estimatedProfit" double precision DEFAULT 0 NOT NULL,
	"totalOrders" integer DEFAULT 0 NOT NULL,
	"closedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "StockMovement" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"restaurantId" uuid NOT NULL,
	"productId" uuid NOT NULL,
	"orderId" integer,
	"type" "StockMovementType" NOT NULL,
	"quantityDelta" integer NOT NULL,
	"previousQuantity" integer NOT NULL,
	"currentQuantity" integer NOT NULL,
	"reason" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "MenuCategory" ADD COLUMN "imageUrl" text;--> statement-breakpoint
ALTER TABLE "MenuCategory" ADD COLUMN "displayOrder" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "MenuCategory" ADD COLUMN "isActive" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "OrderProduct" ADD COLUMN "unitCost" double precision DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "OrderProduct" ADD COLUMN "lineTotal" double precision DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "OrderProduct" ADD COLUMN "productNameSnapshot" text;--> statement-breakpoint
ALTER TABLE "Order" ADD COLUMN "subtotal" double precision DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "Order" ADD COLUMN "discountAmount" double precision DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "Order" ADD COLUMN "deliveryFee" double precision DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "Order" ADD COLUMN "estimatedCost" double precision DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "Order" ADD COLUMN "estimatedProfit" double precision DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "Order" ADD COLUMN "paymentStatus" "PaymentStatus" DEFAULT 'PENDING' NOT NULL;--> statement-breakpoint
ALTER TABLE "Order" ADD COLUMN "notes" text;--> statement-breakpoint
ALTER TABLE "Order" ADD COLUMN "paidAt" timestamp;--> statement-breakpoint
ALTER TABLE "Order" ADD COLUMN "cancelledAt" timestamp;--> statement-breakpoint
ALTER TABLE "Order" ADD COLUMN "finishedAt" timestamp;--> statement-breakpoint
ALTER TABLE "Order" ADD COLUMN "closedAt" timestamp;--> statement-breakpoint
ALTER TABLE "Product" ADD COLUMN "costPrice" double precision DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "Product" ADD COLUMN "sku" text;--> statement-breakpoint
ALTER TABLE "Product" ADD COLUMN "trackInventory" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "Product" ADD COLUMN "stockQuantity" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "Product" ADD COLUMN "lowStockThreshold" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "Product" ADD COLUMN "isActive" boolean DEFAULT true NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "FinancialClosing" ADD CONSTRAINT "FinancialClosing_restaurantId_Restaurant_id_fk" FOREIGN KEY ("restaurantId") REFERENCES "public"."Restaurant"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_restaurantId_Restaurant_id_fk" FOREIGN KEY ("restaurantId") REFERENCES "public"."Restaurant"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_productId_Product_id_fk" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_orderId_Order_id_fk" FOREIGN KEY ("orderId") REFERENCES "public"."Order"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
UPDATE "Order"
SET
	"subtotal" = "total",
	"estimatedProfit" = "total",
	"paymentStatus" = CASE
		WHEN "status" = 'PAYMENT_CONFIRMED' THEN 'PAID'::"PaymentStatus"
		WHEN "status" = 'PAYMENT_FAILED' THEN 'FAILED'::"PaymentStatus"
		ELSE 'PENDING'::"PaymentStatus"
	END,
	"paidAt" = CASE
		WHEN "status" = 'PAYMENT_CONFIRMED' THEN "updatedAt"
		ELSE NULL
	END;
--> statement-breakpoint
UPDATE "OrderProduct" AS op
SET
	"lineTotal" = op."price" * op."quantity",
	"productNameSnapshot" = p."name"
FROM "Product" AS p
WHERE p."id" = op."productId";
--> statement-breakpoint
ALTER TABLE "OrderProduct" ALTER COLUMN "productNameSnapshot" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "public"."Order" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
UPDATE "Order"
SET "status" = CASE
	WHEN "status" IN ('PAYMENT_CONFIRMED', 'PAYMENT_FAILED') THEN 'PENDING'
	ELSE "status"
END;
--> statement-breakpoint
DROP TYPE "public"."OrderStatus";--> statement-breakpoint
CREATE TYPE "public"."OrderStatus" AS ENUM('PENDING', 'IN_PREPARATION', 'READY_FOR_PICKUP', 'OUT_FOR_DELIVERY', 'FINISHED', 'CANCELLED');--> statement-breakpoint
ALTER TABLE "public"."Order" ALTER COLUMN "status" SET DATA TYPE "public"."OrderStatus" USING "status"::"public"."OrderStatus";
