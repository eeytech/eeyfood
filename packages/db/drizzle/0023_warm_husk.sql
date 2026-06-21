CREATE TYPE "public"."ComandaAvulsaStatus" AS ENUM('ACTIVE', 'CLOSED', 'BLOCKED');--> statement-breakpoint
CREATE TYPE "public"."QueueStatus" AS ENUM('WAITING', 'CALLED', 'SEATED', 'LEFT');--> statement-breakpoint
CREATE TYPE "public"."ReservationStatus" AS ENUM('PENDING', 'CONFIRMED', 'CANCELLED', 'FINISHED');--> statement-breakpoint
CREATE TYPE "public"."WaiterStatus" AS ENUM('ACTIVE', 'INACTIVE');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ComandaAvulsa" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"restaurantId" uuid NOT NULL,
	"numero" integer NOT NULL,
	"status" "ComandaAvulsaStatus" DEFAULT 'ACTIVE' NOT NULL,
	"customerName" text,
	"barcode" text,
	"orderId" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "CommissionRule" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"restaurantId" uuid NOT NULL,
	"name" text NOT NULL,
	"serviceFeePercent" double precision DEFAULT 10 NOT NULL,
	"waiterSharePercent" double precision DEFAULT 100 NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "TableReservation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"restaurantId" uuid NOT NULL,
	"diningTableId" uuid,
	"customerName" text NOT NULL,
	"customerPhone" text,
	"partySize" integer NOT NULL,
	"scheduledFor" timestamp NOT NULL,
	"status" "ReservationStatus" DEFAULT 'PENDING' NOT NULL,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "TipClosing" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"restaurantId" uuid NOT NULL,
	"waiterId" uuid NOT NULL,
	"amount" double precision NOT NULL,
	"referenceDate" date NOT NULL,
	"paidAt" timestamp,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "Waiter" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"phone" text,
	"cpf" text,
	"commissionPercent" double precision DEFAULT 0 NOT NULL,
	"status" "WaiterStatus" DEFAULT 'ACTIVE' NOT NULL,
	"restaurantId" uuid NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "WaitingQueue" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"restaurantId" uuid NOT NULL,
	"position" integer NOT NULL,
	"customerName" text NOT NULL,
	"partySize" integer NOT NULL,
	"arrivedAt" timestamp DEFAULT now() NOT NULL,
	"status" "QueueStatus" DEFAULT 'WAITING' NOT NULL,
	"diningTableId" uuid,
	"seatedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "DiningTable" ADD COLUMN "minimumConsumption" double precision DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "DiningTable" ADD COLUMN "positionX" double precision DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "DiningTable" ADD COLUMN "positionY" double precision DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "Order" ADD COLUMN "waiterId" uuid;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ComandaAvulsa" ADD CONSTRAINT "ComandaAvulsa_restaurantId_Restaurant_id_fk" FOREIGN KEY ("restaurantId") REFERENCES "public"."Restaurant"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ComandaAvulsa" ADD CONSTRAINT "ComandaAvulsa_orderId_Order_id_fk" FOREIGN KEY ("orderId") REFERENCES "public"."Order"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "CommissionRule" ADD CONSTRAINT "CommissionRule_restaurantId_Restaurant_id_fk" FOREIGN KEY ("restaurantId") REFERENCES "public"."Restaurant"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "TableReservation" ADD CONSTRAINT "TableReservation_restaurantId_Restaurant_id_fk" FOREIGN KEY ("restaurantId") REFERENCES "public"."Restaurant"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "TableReservation" ADD CONSTRAINT "TableReservation_diningTableId_DiningTable_id_fk" FOREIGN KEY ("diningTableId") REFERENCES "public"."DiningTable"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "TipClosing" ADD CONSTRAINT "TipClosing_restaurantId_Restaurant_id_fk" FOREIGN KEY ("restaurantId") REFERENCES "public"."Restaurant"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "TipClosing" ADD CONSTRAINT "TipClosing_waiterId_Waiter_id_fk" FOREIGN KEY ("waiterId") REFERENCES "public"."Waiter"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Waiter" ADD CONSTRAINT "Waiter_restaurantId_Restaurant_id_fk" FOREIGN KEY ("restaurantId") REFERENCES "public"."Restaurant"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "WaitingQueue" ADD CONSTRAINT "WaitingQueue_restaurantId_Restaurant_id_fk" FOREIGN KEY ("restaurantId") REFERENCES "public"."Restaurant"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "WaitingQueue" ADD CONSTRAINT "WaitingQueue_diningTableId_DiningTable_id_fk" FOREIGN KEY ("diningTableId") REFERENCES "public"."DiningTable"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "comanda_avulsa_restaurant_numero_unique" ON "ComandaAvulsa" USING btree ("restaurantId","numero");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Order" ADD CONSTRAINT "Order_waiterId_Waiter_id_fk" FOREIGN KEY ("waiterId") REFERENCES "public"."Waiter"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
