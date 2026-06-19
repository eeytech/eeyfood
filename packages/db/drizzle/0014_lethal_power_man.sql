ALTER TABLE "ProductOption" ADD COLUMN "imageUrl" text;--> statement-breakpoint
ALTER TABLE "Restaurant" ADD COLUMN "showOptionImages" boolean DEFAULT true NOT NULL;