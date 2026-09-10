CREATE TABLE IF NOT EXISTS "CustomerAddress" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customerPhone" text NOT NULL,
	"street" text NOT NULL,
	"number" text NOT NULL,
	"neighborhood" text NOT NULL,
	"complement" text,
	"reference" text,
	"city" text,
	"state" text,
	"lastUsedAt" timestamp DEFAULT now() NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "Order" ADD COLUMN "customerAddressId" uuid;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "customer_address_phone_idx" ON "CustomerAddress" USING btree ("customerPhone");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Order" ADD CONSTRAINT "Order_customerAddressId_CustomerAddress_id_fk" FOREIGN KEY ("customerAddressId") REFERENCES "public"."CustomerAddress"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
