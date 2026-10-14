ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "showPromotionalBanners" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "promotionalBanners" jsonb;
