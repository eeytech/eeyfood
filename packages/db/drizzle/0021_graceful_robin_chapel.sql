CREATE TABLE IF NOT EXISTS "ProductToOptionGroup" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"productId" uuid NOT NULL,
	"productOptionGroupId" uuid NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "RecipeItem" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"productId" uuid NOT NULL,
	"inventoryItemId" uuid NOT NULL,
	"quantityNeeded" double precision NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ProductOptionGroup" DROP CONSTRAINT "ProductOptionGroup_productId_Product_id_fk";
--> statement-breakpoint
ALTER TABLE "ProductOptionGroup" ALTER COLUMN "productId" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "ProductOptionGroup" ADD COLUMN "restaurantId" uuid NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ProductToOptionGroup" ADD CONSTRAINT "ProductToOptionGroup_productId_Product_id_fk" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ProductToOptionGroup" ADD CONSTRAINT "ProductToOptionGroup_productOptionGroupId_ProductOptionGroup_id_fk" FOREIGN KEY ("productOptionGroupId") REFERENCES "public"."ProductOptionGroup"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "RecipeItem" ADD CONSTRAINT "RecipeItem_productId_Product_id_fk" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "RecipeItem" ADD CONSTRAINT "RecipeItem_inventoryItemId_InventoryItem_id_fk" FOREIGN KEY ("inventoryItemId") REFERENCES "public"."InventoryItem"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ProductToOptionGroup_productId_groupId_idx" ON "ProductToOptionGroup" USING btree ("productId","productOptionGroupId");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ProductOptionGroup" ADD CONSTRAINT "ProductOptionGroup_restaurantId_Restaurant_id_fk" FOREIGN KEY ("restaurantId") REFERENCES "public"."Restaurant"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ProductOptionGroup" ADD CONSTRAINT "ProductOptionGroup_productId_Product_id_fk" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
