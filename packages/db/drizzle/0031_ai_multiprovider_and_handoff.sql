CREATE TABLE IF NOT EXISTS "AiCustomerHandoff" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"restaurantId" uuid NOT NULL,
	"customerPhone" text NOT NULL,
	"customerName" text,
	"pausedAt" timestamp DEFAULT now() NOT NULL,
	"status" text DEFAULT 'WAITING_HUMAN' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "AiCustomerHandoff" ADD CONSTRAINT "AiCustomerHandoff_restaurantId_Restaurant_id_fk" FOREIGN KEY ("restaurantId") REFERENCES "public"."Restaurant"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "AiSettings" ADD COLUMN IF NOT EXISTS "aiProvider" text DEFAULT 'GOOGLE_GEMINI' NOT NULL;--> statement-breakpoint
ALTER TABLE "AiSettings" ADD COLUMN IF NOT EXISTS "geminiApiKey" text;--> statement-breakpoint
ALTER TABLE "AiSettings" ADD COLUMN IF NOT EXISTS "groqApiKey" text;
