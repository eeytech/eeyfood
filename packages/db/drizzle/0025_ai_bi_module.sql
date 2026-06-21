CREATE TYPE "public"."ConversationStatus" AS ENUM('BOT_ACTIVE', 'HUMAN_REQUIRED');--> statement-breakpoint
CREATE TYPE "public"."MarketingChannel" AS ENUM('META_ADS', 'GOOGLE_ADS', 'OTHER');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "MarketingSpend" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"restaurantId" uuid NOT NULL,
	"referenceMonth" date NOT NULL,
	"channel" "MarketingChannel" NOT NULL,
	"amountSpent" double precision NOT NULL,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "AiSettings" ADD COLUMN IF NOT EXISTS "isBotPaused" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "AiSettings" ADD COLUMN IF NOT EXISTS "pausedAt" timestamp;--> statement-breakpoint
ALTER TABLE "AiSettings" ADD COLUMN IF NOT EXISTS "pausedForPhone" text;--> statement-breakpoint
ALTER TABLE "AiSettings" ADD COLUMN IF NOT EXISTS "conversationStatus" "ConversationStatus" DEFAULT 'BOT_ACTIVE' NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "MarketingSpend" ADD CONSTRAINT "MarketingSpend_restaurantId_Restaurant_id_fk" FOREIGN KEY ("restaurantId") REFERENCES "public"."Restaurant"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
