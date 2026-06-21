CREATE TYPE "public"."CashMovementType" AS ENUM('SANGRIA', 'SUPRIMENTO');--> statement-breakpoint
CREATE TYPE "public"."CashRegisterShiftStatus" AS ENUM('OPEN', 'CLOSED');--> statement-breakpoint
ALTER TYPE "public"."PaymentMethod" ADD VALUE 'PIX';--> statement-breakpoint
ALTER TYPE "public"."PaymentMethod" ADD VALUE 'VALE_ALIMENTACAO';--> statement-breakpoint
ALTER TYPE "public"."PaymentMethod" ADD VALUE 'VALE_REFEICAO';--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "CashMovement" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shiftId" uuid NOT NULL,
	"restaurantId" uuid NOT NULL,
	"type" "CashMovementType" NOT NULL,
	"amount" double precision NOT NULL,
	"reason" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "CashRegisterShift" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"restaurantId" uuid NOT NULL,
	"openedByUser" text NOT NULL,
	"openedAt" timestamp DEFAULT now() NOT NULL,
	"closedAt" timestamp,
	"openingAmount" double precision DEFAULT 0 NOT NULL,
	"expectedClosingAmount" double precision,
	"actualClosingAmount" double precision,
	"closingDifference" double precision,
	"status" "CashRegisterShiftStatus" DEFAULT 'OPEN' NOT NULL,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "OrderProduct" ALTER COLUMN "quantity" SET DATA TYPE double precision;--> statement-breakpoint
ALTER TABLE "Order" ADD COLUMN "cashRegisterShiftId" uuid;--> statement-breakpoint
ALTER TABLE "Order" ADD COLUMN "serviceFeePercent" double precision;--> statement-breakpoint
ALTER TABLE "Order" ADD COLUMN "serviceFeeAmount" double precision DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "Order" ADD COLUMN "paymentSplits" jsonb;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "CashMovement" ADD CONSTRAINT "CashMovement_shiftId_CashRegisterShift_id_fk" FOREIGN KEY ("shiftId") REFERENCES "public"."CashRegisterShift"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "CashMovement" ADD CONSTRAINT "CashMovement_restaurantId_Restaurant_id_fk" FOREIGN KEY ("restaurantId") REFERENCES "public"."Restaurant"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "CashRegisterShift" ADD CONSTRAINT "CashRegisterShift_restaurantId_Restaurant_id_fk" FOREIGN KEY ("restaurantId") REFERENCES "public"."Restaurant"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Order" ADD CONSTRAINT "Order_cashRegisterShiftId_CashRegisterShift_id_fk" FOREIGN KEY ("cashRegisterShiftId") REFERENCES "public"."CashRegisterShift"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
