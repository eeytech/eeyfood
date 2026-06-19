-- Step 1: Add restaurantId as nullable initially
ALTER TABLE "ProductOptionGroup" ADD COLUMN "restaurantId" uuid;
--> statement-breakpoint

-- Step 2: Populate restaurantId from existing product FK data
UPDATE "ProductOptionGroup" pog
SET "restaurantId" = p."restaurantId"
FROM "Product" p
WHERE pog."productId" = p.id;
--> statement-breakpoint

-- Step 3: Make restaurantId NOT NULL now that it's populated
ALTER TABLE "ProductOptionGroup" ALTER COLUMN "restaurantId" SET NOT NULL;
--> statement-breakpoint

-- Step 4: Add FK constraint for restaurantId
DO $$ BEGIN
 ALTER TABLE "ProductOptionGroup" ADD CONSTRAINT "ProductOptionGroup_restaurantId_Restaurant_id_fk" FOREIGN KEY ("restaurantId") REFERENCES "public"."Restaurant"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

-- Step 5: Drop old NOT NULL + CASCADE FK on productId, re-add as nullable with SET NULL
ALTER TABLE "ProductOptionGroup" ALTER COLUMN "productId" DROP NOT NULL;
--> statement-breakpoint

ALTER TABLE "ProductOptionGroup" DROP CONSTRAINT IF EXISTS "ProductOptionGroup_productId_Product_id_fk";
--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "ProductOptionGroup" ADD CONSTRAINT "ProductOptionGroup_productId_Product_id_fk" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

-- Step 6: Create pivot table
CREATE TABLE IF NOT EXISTS "ProductToOptionGroup" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"productId" uuid NOT NULL,
	"productOptionGroupId" uuid NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

-- Step 7: Add FK constraints on pivot table
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

-- Step 8: Migrate existing data — every group that had a productId gets a pivot row
INSERT INTO "ProductToOptionGroup" ("id", "productId", "productOptionGroupId", "createdAt")
SELECT gen_random_uuid(), pog."productId", pog.id, NOW()
FROM "ProductOptionGroup" pog
WHERE pog."productId" IS NOT NULL;
--> statement-breakpoint

-- Step 9: Unique index to prevent duplicate links
CREATE UNIQUE INDEX IF NOT EXISTS "ProductToOptionGroup_productId_groupId_idx" ON "ProductToOptionGroup" ("productId","productOptionGroupId");
