CREATE TYPE "public"."InventoryItemType" AS ENUM('INSUMO', 'EMBALAGEM', 'EQUIPAMENTO', 'LIMPEZA', 'OUTROS');--> statement-breakpoint
CREATE TYPE "public"."UnitOfMeasure" AS ENUM('UN', 'KG', 'G', 'L', 'ML', 'CX', 'PCT', 'M');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "InventoryItem" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"restaurantId" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"type" "InventoryItemType" NOT NULL,
	"sku" text,
	"unitOfMeasure" "UnitOfMeasure" DEFAULT 'UN' NOT NULL,
	"currentQuantity" double precision DEFAULT 0 NOT NULL,
	"lowStockThreshold" double precision DEFAULT 0 NOT NULL,
	"unitCost" double precision,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "StockMovement" ALTER COLUMN "productId" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "StockMovement" ALTER COLUMN "quantityDelta" SET DATA TYPE double precision;--> statement-breakpoint
ALTER TABLE "StockMovement" ALTER COLUMN "previousQuantity" SET DATA TYPE double precision;--> statement-breakpoint
ALTER TABLE "StockMovement" ALTER COLUMN "currentQuantity" SET DATA TYPE double precision;--> statement-breakpoint
ALTER TABLE "StockMovement" ADD COLUMN "inventoryItemId" uuid;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_restaurantId_Restaurant_id_fk" FOREIGN KEY ("restaurantId") REFERENCES "public"."Restaurant"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_inventoryItemId_InventoryItem_id_fk" FOREIGN KEY ("inventoryItemId") REFERENCES "public"."InventoryItem"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
