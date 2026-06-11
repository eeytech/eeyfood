CREATE TABLE IF NOT EXISTS "LoyaltyRule" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"restaurantId" uuid NOT NULL,
	"name" text NOT NULL,
	"minOrderValue" double precision DEFAULT 0 NOT NULL,
	"cashbackPercent" double precision NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "OrderProductOption" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"orderProductId" uuid NOT NULL,
	"productOptionId" uuid NOT NULL,
	"nameSnapshot" text NOT NULL,
	"priceSnapshot" double precision NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "OrderRating" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"orderId" integer NOT NULL,
	"restaurantId" uuid NOT NULL,
	"customerName" text NOT NULL,
	"stars" integer NOT NULL,
	"comment" text,
	"imageUrl" text,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ProductOptionGroup" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"minOptions" integer DEFAULT 0 NOT NULL,
	"maxOptions" integer DEFAULT 1 NOT NULL,
	"displayOrder" integer DEFAULT 0 NOT NULL,
	"productId" uuid NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ProductOption" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"price" double precision DEFAULT 0 NOT NULL,
	"displayOrder" integer DEFAULT 0 NOT NULL,
	"productOptionGroupId" uuid NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "Courier" ADD COLUMN "latitude" double precision;--> statement-breakpoint
ALTER TABLE "Courier" ADD COLUMN "longitude" double precision;--> statement-breakpoint
ALTER TABLE "Order" ADD COLUMN "deliveryAddress" text;--> statement-breakpoint
ALTER TABLE "Order" ADD COLUMN "deliveryLatitude" double precision;--> statement-breakpoint
ALTER TABLE "Order" ADD COLUMN "deliveryLongitude" double precision;--> statement-breakpoint
ALTER TABLE "Restaurant" ADD COLUMN "cashbackPercent" double precision DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "Restaurant" ADD COLUMN "address" text;--> statement-breakpoint
ALTER TABLE "Restaurant" ADD COLUMN "latitude" double precision;--> statement-breakpoint
ALTER TABLE "Restaurant" ADD COLUMN "longitude" double precision;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "LoyaltyRule" ADD CONSTRAINT "LoyaltyRule_restaurantId_Restaurant_id_fk" FOREIGN KEY ("restaurantId") REFERENCES "public"."Restaurant"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "OrderProductOption" ADD CONSTRAINT "OrderProductOption_orderProductId_OrderProduct_id_fk" FOREIGN KEY ("orderProductId") REFERENCES "public"."OrderProduct"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "OrderProductOption" ADD CONSTRAINT "OrderProductOption_productOptionId_ProductOption_id_fk" FOREIGN KEY ("productOptionId") REFERENCES "public"."ProductOption"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "OrderRating" ADD CONSTRAINT "OrderRating_orderId_Order_id_fk" FOREIGN KEY ("orderId") REFERENCES "public"."Order"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "OrderRating" ADD CONSTRAINT "OrderRating_restaurantId_Restaurant_id_fk" FOREIGN KEY ("restaurantId") REFERENCES "public"."Restaurant"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ProductOptionGroup" ADD CONSTRAINT "ProductOptionGroup_productId_Product_id_fk" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ProductOption" ADD CONSTRAINT "ProductOption_productOptionGroupId_ProductOptionGroup_id_fk" FOREIGN KEY ("productOptionGroupId") REFERENCES "public"."ProductOptionGroup"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
