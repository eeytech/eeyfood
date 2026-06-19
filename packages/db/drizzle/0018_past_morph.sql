ALTER TABLE "LoyaltyRule" ADD COLUMN "menuCategoryId" uuid;--> statement-breakpoint
ALTER TABLE "LoyaltyRule" ADD COLUMN "productId" uuid;--> statement-breakpoint
ALTER TABLE "Restaurant" ADD COLUMN "isDeliveryEnabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "Restaurant" ADD COLUMN "isTakeawayEnabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "Restaurant" ADD COLUMN "isDineInEnabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "LoyaltyRule" ADD CONSTRAINT "LoyaltyRule_menuCategoryId_MenuCategory_id_fk" FOREIGN KEY ("menuCategoryId") REFERENCES "public"."MenuCategory"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "LoyaltyRule" ADD CONSTRAINT "LoyaltyRule_productId_Product_id_fk" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
