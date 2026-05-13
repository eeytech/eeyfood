CREATE TYPE "public"."ConsumptionMethod" AS ENUM('TAKEAWAY', 'DINE_IN');--> statement-breakpoint
CREATE TYPE "public"."OrderStatus" AS ENUM('PENDING', 'IN_PREPARATION', 'PAYMENT_CONFIRMED', 'PAYMENT_FAILED', 'FINISHED');--> statement-breakpoint
CREATE TYPE "public"."PaymentMethod" AS ENUM('MERCADO_PAGO', 'DINHEIRO', 'CARTAO_PRESENCIAL');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "MenuCategory" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"restaurantId" uuid NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "OrderProduct" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"productId" uuid NOT NULL,
	"orderId" integer NOT NULL,
	"quantity" integer NOT NULL,
	"price" double precision NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "Order" (
	"id" serial PRIMARY KEY NOT NULL,
	"total" double precision NOT NULL,
	"status" "OrderStatus" NOT NULL,
	"consumptionMethod" "ConsumptionMethod" NOT NULL,
	"paymentMethod" "PaymentMethod" NOT NULL,
	"changeFor" double precision,
	"restaurantId" uuid NOT NULL,
	"customerName" text NOT NULL,
	"customerCpf" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "Product" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"price" double precision NOT NULL,
	"imageUrl" text NOT NULL,
	"ingredients" text[] NOT NULL,
	"restaurantId" uuid NOT NULL,
	"menuCategoryId" uuid NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "Restaurant" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text NOT NULL,
	"avatarImageUrl" text NOT NULL,
	"coverImageUrl" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "Restaurant_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "MenuCategory" ADD CONSTRAINT "MenuCategory_restaurantId_Restaurant_id_fk" FOREIGN KEY ("restaurantId") REFERENCES "public"."Restaurant"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "OrderProduct" ADD CONSTRAINT "OrderProduct_productId_Product_id_fk" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "OrderProduct" ADD CONSTRAINT "OrderProduct_orderId_Order_id_fk" FOREIGN KEY ("orderId") REFERENCES "public"."Order"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Order" ADD CONSTRAINT "Order_restaurantId_Restaurant_id_fk" FOREIGN KEY ("restaurantId") REFERENCES "public"."Restaurant"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Product" ADD CONSTRAINT "Product_restaurantId_Restaurant_id_fk" FOREIGN KEY ("restaurantId") REFERENCES "public"."Restaurant"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Product" ADD CONSTRAINT "Product_menuCategoryId_MenuCategory_id_fk" FOREIGN KEY ("menuCategoryId") REFERENCES "public"."MenuCategory"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
