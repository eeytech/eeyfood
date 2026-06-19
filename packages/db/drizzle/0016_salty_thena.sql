CREATE TYPE "public"."VehicleStatus" AS ENUM('ACTIVE', 'MAINTENANCE', 'INACTIVE');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "CompanyVehicle" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"restaurantId" uuid NOT NULL,
	"brand" text NOT NULL,
	"model" text NOT NULL,
	"year" integer,
	"color" text,
	"licensePlate" text NOT NULL,
	"renavam" text,
	"chassi" text,
	"status" "VehicleStatus" DEFAULT 'ACTIVE' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "Courier" ADD COLUMN "cpf" text;--> statement-breakpoint
ALTER TABLE "Courier" ADD COLUMN "rg" text;--> statement-breakpoint
ALTER TABLE "Courier" ADD COLUMN "cep" text;--> statement-breakpoint
ALTER TABLE "Courier" ADD COLUMN "logradouro" text;--> statement-breakpoint
ALTER TABLE "Courier" ADD COLUMN "numero" text;--> statement-breakpoint
ALTER TABLE "Courier" ADD COLUMN "complemento" text;--> statement-breakpoint
ALTER TABLE "Courier" ADD COLUMN "bairro" text;--> statement-breakpoint
ALTER TABLE "Courier" ADD COLUMN "cidade" text;--> statement-breakpoint
ALTER TABLE "Courier" ADD COLUMN "estado" text;--> statement-breakpoint
ALTER TABLE "Courier" ADD COLUMN "cnhNumero" text;--> statement-breakpoint
ALTER TABLE "Courier" ADD COLUMN "cnhCategoria" text;--> statement-breakpoint
ALTER TABLE "Courier" ADD COLUMN "cnhVencimento" date;--> statement-breakpoint
ALTER TABLE "Courier" ADD COLUMN "usesOwnVehicle" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "Courier" ADD COLUMN "workDays" text[];--> statement-breakpoint
ALTER TABLE "Courier" ADD COLUMN "shiftStart" text;--> statement-breakpoint
ALTER TABLE "Courier" ADD COLUMN "shiftEnd" text;--> statement-breakpoint
ALTER TABLE "Courier" ADD COLUMN "isAvailable" boolean DEFAULT false NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "CompanyVehicle" ADD CONSTRAINT "CompanyVehicle_restaurantId_Restaurant_id_fk" FOREIGN KEY ("restaurantId") REFERENCES "public"."Restaurant"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
