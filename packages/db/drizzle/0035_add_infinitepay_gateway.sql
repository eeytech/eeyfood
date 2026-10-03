ALTER TYPE "public"."PaymentMethod" ADD VALUE IF NOT EXISTS 'INFINITEPAY';--> statement-breakpoint
ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "onlinePaymentGateway" text DEFAULT 'MERCADO_PAGO' NOT NULL;--> statement-breakpoint
ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "infinitePayHandle" text;
