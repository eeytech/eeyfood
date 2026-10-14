ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "acceptValeRefeicao" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "acceptValeAlimentacao" boolean DEFAULT false NOT NULL;
