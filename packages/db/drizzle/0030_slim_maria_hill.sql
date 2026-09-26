DO $$ BEGIN
 CREATE TYPE "public"."TicketCategory" AS ENUM('PDV_CAIXA', 'KDS_COZINHA', 'CARDAPIO_ESTOQUE', 'IMPRESSAO_HARDWARE', 'FINANCEIRO_FISCAL', 'INTEGRACOES', 'OUTRO');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."TicketPriority" AS ENUM('LOW', 'NORMAL', 'HIGH', 'URGENT');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."TicketSender" AS ENUM('USER', 'SUPPORT');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."TicketStatus" AS ENUM('OPEN', 'IN_PROGRESS', 'WAITING_CUSTOMER', 'RESOLVED', 'CLOSED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TYPE "public"."UserRole" ADD VALUE IF NOT EXISTS 'PANEL';--> statement-breakpoint
ALTER TYPE "public"."UserRole" ADD VALUE IF NOT EXISTS 'COURIER';--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "FreeDeliveryRule" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"restaurantId" uuid NOT NULL,
	"name" text NOT NULL,
	"criterion" text DEFAULT 'MIN_ORDER_VALUE' NOT NULL,
	"minOrderValue" numeric(10, 2) DEFAULT 0 NOT NULL,
	"menuCategoryId" uuid,
	"productId" uuid,
	"isActive" boolean DEFAULT true NOT NULL,
	"startsAt" timestamp,
	"endsAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "SupportTicketMessage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticketId" uuid NOT NULL,
	"sender" "TicketSender" NOT NULL,
	"senderName" text NOT NULL,
	"content" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "SupportTicket" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"restaurantId" uuid,
	"protocol" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"category" "TicketCategory" DEFAULT 'OUTRO' NOT NULL,
	"priority" "TicketPriority" DEFAULT 'NORMAL' NOT NULL,
	"status" "TicketStatus" DEFAULT 'OPEN' NOT NULL,
	"userName" text NOT NULL,
	"userEmail" text NOT NULL,
	"userPhone" text,
	"restaurantSlug" text DEFAULT '' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "SupportTicket_protocol_unique" UNIQUE("protocol")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "FreeDeliveryRule" ADD CONSTRAINT "FreeDeliveryRule_restaurantId_Restaurant_id_fk" FOREIGN KEY ("restaurantId") REFERENCES "public"."Restaurant"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "FreeDeliveryRule" ADD CONSTRAINT "FreeDeliveryRule_menuCategoryId_MenuCategory_id_fk" FOREIGN KEY ("menuCategoryId") REFERENCES "public"."MenuCategory"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "FreeDeliveryRule" ADD CONSTRAINT "FreeDeliveryRule_productId_Product_id_fk" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "SupportTicketMessage" ADD CONSTRAINT "SupportTicketMessage_ticketId_SupportTicket_id_fk" FOREIGN KEY ("ticketId") REFERENCES "public"."SupportTicket"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_restaurantId_Restaurant_id_fk" FOREIGN KEY ("restaurantId") REFERENCES "public"."Restaurant"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
