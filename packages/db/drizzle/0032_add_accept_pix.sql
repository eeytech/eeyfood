ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "acceptPix" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "pixKey" text;
