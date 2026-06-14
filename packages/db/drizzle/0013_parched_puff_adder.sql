ALTER TABLE "Restaurant" ADD COLUMN "acceptMercadoPago" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "Restaurant" ADD COLUMN "isCouponsEnabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "Restaurant" ADD COLUMN "isCashbackEnabled" boolean DEFAULT true NOT NULL;