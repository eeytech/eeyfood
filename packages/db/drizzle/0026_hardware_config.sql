ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "scaleProtocol" text;--> statement-breakpoint
ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "scaleBaudRate" integer DEFAULT 9600;--> statement-breakpoint
ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "drawerPulseHex" text;
