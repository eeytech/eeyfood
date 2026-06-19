ALTER TABLE "Restaurant" ADD COLUMN "deliveryFee" double precision DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "Restaurant" ADD COLUMN "minimumOrderValue" double precision DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "Restaurant" ADD COLUMN "freeDeliveryThreshold" double precision;--> statement-breakpoint
ALTER TABLE "Restaurant" ADD COLUMN "estimatedDeliveryTime" text;