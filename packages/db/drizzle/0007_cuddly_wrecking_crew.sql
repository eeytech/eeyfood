CREATE TYPE "public"."TransactionStatus" AS ENUM('PENDING', 'PAID', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."TransactionType" AS ENUM('REVENUE', 'EXPENSE');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "AiSettings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"restaurantId" uuid NOT NULL,
	"openaiApiKey" text,
	"evolutionInstanceName" text,
	"evolutionApiKey" text,
	"botName" text DEFAULT 'EeyFood Bot' NOT NULL,
	"systemPrompt" text DEFAULT 'Você é um atendente virtual de delivery educado e eficiente. Ajude o cliente a escolher itens do cardápio e finalize o pedido capturando nome, telefone e itens.',
	"isBotActive" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "AiSettings_restaurantId_unique" UNIQUE("restaurantId")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "Courier" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"vehicleType" text,
	"licensePlate" text,
	"isActive" boolean DEFAULT true NOT NULL,
	"restaurantId" uuid NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "FinancialCategory" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"type" "TransactionType" NOT NULL,
	"restaurantId" uuid NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "FinancialTransaction" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"description" text NOT NULL,
	"amount" double precision NOT NULL,
	"type" "TransactionType" NOT NULL,
	"status" "TransactionStatus" DEFAULT 'PENDING' NOT NULL,
	"dueDate" timestamp NOT NULL,
	"paidAt" timestamp,
	"categoryId" uuid,
	"orderId" integer,
	"restaurantId" uuid NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "Order" ADD COLUMN "courierId" uuid;--> statement-breakpoint
ALTER TABLE "Order" ADD COLUMN "dispatchedAt" timestamp;--> statement-breakpoint
ALTER TABLE "Order" ADD COLUMN "deliveredAt" timestamp;--> statement-breakpoint
ALTER TABLE "Product" ADD COLUMN "ncm" text;--> statement-breakpoint
ALTER TABLE "Product" ADD COLUMN "cfop" text;--> statement-breakpoint
ALTER TABLE "Product" ADD COLUMN "csosn" text;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "AiSettings" ADD CONSTRAINT "AiSettings_restaurantId_Restaurant_id_fk" FOREIGN KEY ("restaurantId") REFERENCES "public"."Restaurant"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Courier" ADD CONSTRAINT "Courier_restaurantId_Restaurant_id_fk" FOREIGN KEY ("restaurantId") REFERENCES "public"."Restaurant"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "FinancialCategory" ADD CONSTRAINT "FinancialCategory_restaurantId_Restaurant_id_fk" FOREIGN KEY ("restaurantId") REFERENCES "public"."Restaurant"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "FinancialTransaction" ADD CONSTRAINT "FinancialTransaction_categoryId_FinancialCategory_id_fk" FOREIGN KEY ("categoryId") REFERENCES "public"."FinancialCategory"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "FinancialTransaction" ADD CONSTRAINT "FinancialTransaction_orderId_Order_id_fk" FOREIGN KEY ("orderId") REFERENCES "public"."Order"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "FinancialTransaction" ADD CONSTRAINT "FinancialTransaction_restaurantId_Restaurant_id_fk" FOREIGN KEY ("restaurantId") REFERENCES "public"."Restaurant"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Order" ADD CONSTRAINT "Order_courierId_Courier_id_fk" FOREIGN KEY ("courierId") REFERENCES "public"."Courier"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
