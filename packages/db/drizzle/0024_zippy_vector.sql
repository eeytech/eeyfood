CREATE TYPE "public"."CourierTripStatus" AS ENUM('IN_TRANSIT', 'COMPLETED');--> statement-breakpoint
CREATE TYPE "public"."DeliveryFeeRuleType" AS ENUM('RADIUS_KM', 'NEIGHBORHOOD', 'CEP_RANGE');--> statement-breakpoint
CREATE TYPE "public"."InventoryLossReason" AS ENUM('VENCIDO', 'DANIFICADO', 'ESTRAGADO', 'OUTROS');--> statement-breakpoint
CREATE TYPE "public"."MarketplaceType" AS ENUM('IFOOD', 'RAPPI', 'NINETY_NINE_FOOD');--> statement-breakpoint
CREATE TYPE "public"."OrderProductItemStatus" AS ENUM('PENDING', 'READY');--> statement-breakpoint
CREATE TYPE "public"."PizzaPricingRule" AS ENUM('MAX', 'AVERAGE');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "CourierTrip" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"restaurantId" uuid NOT NULL,
	"courierId" uuid NOT NULL,
	"orderIds" integer[] NOT NULL,
	"commissionAmount" double precision DEFAULT 0 NOT NULL,
	"status" "CourierTripStatus" DEFAULT 'IN_TRANSIT' NOT NULL,
	"departedAt" timestamp DEFAULT now() NOT NULL,
	"returnedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "DeliveryFeeRule" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"restaurantId" uuid NOT NULL,
	"name" text NOT NULL,
	"type" "DeliveryFeeRuleType" NOT NULL,
	"fee" double precision NOT NULL,
	"minimumOrderValue" double precision DEFAULT 0 NOT NULL,
	"freeDeliveryThreshold" double precision,
	"maxDistanceKm" double precision,
	"neighborhood" text,
	"cepFrom" text,
	"cepTo" text,
	"isActive" boolean DEFAULT true NOT NULL,
	"displayOrder" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "InventoryBatch" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"restaurantId" uuid NOT NULL,
	"inventoryItemId" uuid NOT NULL,
	"purchaseInvoiceId" uuid,
	"batchCode" text,
	"quantity" double precision DEFAULT 0 NOT NULL,
	"manufacturingDate" date,
	"expirationDate" date,
	"unitCost" double precision,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "InventoryLoss" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"restaurantId" uuid NOT NULL,
	"inventoryItemId" uuid NOT NULL,
	"quantity" double precision NOT NULL,
	"occurredAt" timestamp DEFAULT now() NOT NULL,
	"reason" "InventoryLossReason" NOT NULL,
	"financialLoss" double precision DEFAULT 0 NOT NULL,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "MarketplaceIntegration" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"restaurantId" uuid NOT NULL,
	"type" "MarketplaceType" NOT NULL,
	"isActive" boolean DEFAULT false NOT NULL,
	"apiToken" text,
	"merchantId" text,
	"menuMappings" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ProductSizePrice" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"productId" uuid NOT NULL,
	"name" text NOT NULL,
	"price" double precision NOT NULL,
	"isDefault" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ProductionSector" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"restaurantId" uuid NOT NULL,
	"name" text NOT NULL,
	"color" text DEFAULT '#6366f1' NOT NULL,
	"displayOrder" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "PurchaseInvoice" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"restaurantId" uuid NOT NULL,
	"supplierId" uuid,
	"accessKey" text,
	"invoiceNumber" text,
	"totalAmount" double precision DEFAULT 0 NOT NULL,
	"xmlContent" text,
	"issuedAt" timestamp,
	"items" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "Supplier" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"restaurantId" uuid NOT NULL,
	"companyName" text NOT NULL,
	"cnpj" text,
	"phone" text,
	"email" text,
	"address" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "MenuCategory" ADD COLUMN "isPizzaCategory" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "OrderProduct" ADD COLUMN "itemStatus" "OrderProductItemStatus" DEFAULT 'PENDING' NOT NULL;--> statement-breakpoint
ALTER TABLE "Order" ADD COLUMN "deliveryProofUrl" text;--> statement-breakpoint
ALTER TABLE "Order" ADD COLUMN "deliveryConfirmationLatitude" double precision;--> statement-breakpoint
ALTER TABLE "Order" ADD COLUMN "deliveryConfirmationLongitude" double precision;--> statement-breakpoint
ALTER TABLE "Order" ADD COLUMN "marketplaceOrderId" text;--> statement-breakpoint
ALTER TABLE "Order" ADD COLUMN "marketplaceType" "MarketplaceType";--> statement-breakpoint
ALTER TABLE "Order" ADD COLUMN "brandName" text;--> statement-breakpoint
ALTER TABLE "Order" ADD COLUMN "brandColor" text;--> statement-breakpoint
ALTER TABLE "Product" ADD COLUMN "videoUrl" text;--> statement-breakpoint
ALTER TABLE "Product" ADD COLUMN "nutritionInfo" jsonb;--> statement-breakpoint
ALTER TABLE "Product" ADD COLUMN "availableFrom" text;--> statement-breakpoint
ALTER TABLE "Product" ADD COLUMN "availableTo" text;--> statement-breakpoint
ALTER TABLE "Product" ADD COLUMN "isVegan" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "Product" ADD COLUMN "isGlutenFree" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "Product" ADD COLUMN "isLactoseFree" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "Product" ADD COLUMN "isSpicy" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "Product" ADD COLUMN "productionSectorId" uuid;--> statement-breakpoint
ALTER TABLE "RecipeItem" ADD COLUMN "yieldFactor" double precision DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "RecipeItem" ADD COLUMN "preparationMethod" text;--> statement-breakpoint
ALTER TABLE "RecipeItem" ADD COLUMN "suggestedMargin" double precision;--> statement-breakpoint
ALTER TABLE "Restaurant" ADD COLUMN "pizzaPricingRule" "PizzaPricingRule" DEFAULT 'MAX' NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "CourierTrip" ADD CONSTRAINT "CourierTrip_restaurantId_Restaurant_id_fk" FOREIGN KEY ("restaurantId") REFERENCES "public"."Restaurant"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "CourierTrip" ADD CONSTRAINT "CourierTrip_courierId_Courier_id_fk" FOREIGN KEY ("courierId") REFERENCES "public"."Courier"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "DeliveryFeeRule" ADD CONSTRAINT "DeliveryFeeRule_restaurantId_Restaurant_id_fk" FOREIGN KEY ("restaurantId") REFERENCES "public"."Restaurant"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "InventoryBatch" ADD CONSTRAINT "InventoryBatch_restaurantId_Restaurant_id_fk" FOREIGN KEY ("restaurantId") REFERENCES "public"."Restaurant"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "InventoryBatch" ADD CONSTRAINT "InventoryBatch_inventoryItemId_InventoryItem_id_fk" FOREIGN KEY ("inventoryItemId") REFERENCES "public"."InventoryItem"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "InventoryBatch" ADD CONSTRAINT "InventoryBatch_purchaseInvoiceId_PurchaseInvoice_id_fk" FOREIGN KEY ("purchaseInvoiceId") REFERENCES "public"."PurchaseInvoice"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "InventoryLoss" ADD CONSTRAINT "InventoryLoss_restaurantId_Restaurant_id_fk" FOREIGN KEY ("restaurantId") REFERENCES "public"."Restaurant"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "InventoryLoss" ADD CONSTRAINT "InventoryLoss_inventoryItemId_InventoryItem_id_fk" FOREIGN KEY ("inventoryItemId") REFERENCES "public"."InventoryItem"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "MarketplaceIntegration" ADD CONSTRAINT "MarketplaceIntegration_restaurantId_Restaurant_id_fk" FOREIGN KEY ("restaurantId") REFERENCES "public"."Restaurant"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ProductSizePrice" ADD CONSTRAINT "ProductSizePrice_productId_Product_id_fk" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ProductionSector" ADD CONSTRAINT "ProductionSector_restaurantId_Restaurant_id_fk" FOREIGN KEY ("restaurantId") REFERENCES "public"."Restaurant"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "PurchaseInvoice" ADD CONSTRAINT "PurchaseInvoice_restaurantId_Restaurant_id_fk" FOREIGN KEY ("restaurantId") REFERENCES "public"."Restaurant"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "PurchaseInvoice" ADD CONSTRAINT "PurchaseInvoice_supplierId_Supplier_id_fk" FOREIGN KEY ("supplierId") REFERENCES "public"."Supplier"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Supplier" ADD CONSTRAINT "Supplier_restaurantId_Restaurant_id_fk" FOREIGN KEY ("restaurantId") REFERENCES "public"."Restaurant"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "marketplace_integration_restaurant_type_unique" ON "MarketplaceIntegration" USING btree ("restaurantId","type");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Product" ADD CONSTRAINT "Product_productionSectorId_ProductionSector_id_fk" FOREIGN KEY ("productionSectorId") REFERENCES "public"."ProductionSector"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
