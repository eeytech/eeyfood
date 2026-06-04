CREATE TYPE "public"."RestaurantStatus" AS ENUM('AUTO', 'ALWAYS_OPEN', 'ALWAYS_CLOSED');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "OperatingHours" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"restaurantId" uuid NOT NULL,
	"dayOfWeek" integer NOT NULL,
	"openTime" text NOT NULL,
	"closeTime" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "Restaurant" ADD COLUMN "status" "RestaurantStatus" DEFAULT 'AUTO' NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "OperatingHours" ADD CONSTRAINT "OperatingHours_restaurantId_Restaurant_id_fk" FOREIGN KEY ("restaurantId") REFERENCES "public"."Restaurant"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
