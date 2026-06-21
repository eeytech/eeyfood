CREATE TYPE "public"."BankAccountType" AS ENUM('CHECKING', 'SAVINGS', 'INTERNAL', 'DIGITAL');--> statement-breakpoint
CREATE TYPE "public"."BankStatementEntryStatus" AS ENUM('PENDING', 'MATCHED', 'IGNORED');--> statement-breakpoint
CREATE TYPE "public"."ConversationStatus" AS ENUM('BOT_ACTIVE', 'HUMAN_REQUIRED');--> statement-breakpoint
CREATE TYPE "public"."CustomerSegment" AS ENUM('NEW', 'VIP', 'INACTIVE', 'AT_RISK', 'RECOVERED');--> statement-breakpoint
CREATE TYPE "public"."FiscalDocumentStatus" AS ENUM('PENDING', 'ISSUED', 'REJECTED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."CustomerInteractionType" AS ENUM('CART_RECOVERY', 'CAMPAIGN', 'BIRTHDAY', 'MANUAL');--> statement-breakpoint
CREATE TYPE "public"."LedgerEntryType" AS ENUM('DEBIT', 'CREDIT');--> statement-breakpoint
CREATE TYPE "public"."MarketingChannel" AS ENUM('META_ADS', 'GOOGLE_ADS', 'OTHER');--> statement-breakpoint
ALTER TYPE "public"."PaymentMethod" ADD VALUE 'FIADO';--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "BankAccount" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"restaurantId" uuid NOT NULL,
	"name" text NOT NULL,
	"type" "BankAccountType" DEFAULT 'CHECKING' NOT NULL,
	"bankName" text,
	"agency" text,
	"accountNumber" text,
	"currentBalance" double precision DEFAULT 0 NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "BankStatementEntry" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"statementId" uuid NOT NULL,
	"restaurantId" uuid NOT NULL,
	"entryDate" date NOT NULL,
	"description" text NOT NULL,
	"amount" double precision NOT NULL,
	"status" "BankStatementEntryStatus" DEFAULT 'PENDING' NOT NULL,
	"matchedTransactionId" uuid,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "BankStatement" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"restaurantId" uuid NOT NULL,
	"bankAccountId" uuid NOT NULL,
	"fileName" text NOT NULL,
	"periodStart" date,
	"periodEnd" date,
	"totalEntries" integer DEFAULT 0 NOT NULL,
	"matchedEntries" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "CustomerInteraction" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"restaurantId" uuid NOT NULL,
	"customerId" uuid NOT NULL,
	"type" "CustomerInteractionType" NOT NULL,
	"channel" text DEFAULT 'WHATSAPP' NOT NULL,
	"message" text NOT NULL,
	"sentAt" timestamp DEFAULT now() NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "CustomerLedgerEntry" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ledgerId" uuid NOT NULL,
	"restaurantId" uuid NOT NULL,
	"orderId" integer,
	"bankAccountId" uuid,
	"type" "LedgerEntryType" NOT NULL,
	"amount" double precision NOT NULL,
	"description" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "CustomerLedger" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"restaurantId" uuid NOT NULL,
	"customerName" text NOT NULL,
	"customerPhone" text,
	"customerCpf" text,
	"creditLimit" double precision DEFAULT 200 NOT NULL,
	"debtBalance" double precision DEFAULT 0 NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "Customer" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"restaurantId" uuid NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"phone" text NOT NULL,
	"cpf" text,
	"birthDate" date,
	"firstOrderAt" timestamp,
	"lastOrderAt" timestamp,
	"avgTicket" double precision DEFAULT 0 NOT NULL,
	"totalOrders" integer DEFAULT 0 NOT NULL,
	"totalSpent" double precision DEFAULT 0 NOT NULL,
	"segment" "CustomerSegment" DEFAULT 'NEW' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "FiscalSettings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"restaurantId" uuid NOT NULL,
	"cnpj" text,
	"inscricaoEstadual" text,
	"ambienteFiscal" text DEFAULT 'homologacao' NOT NULL,
	"certificadoPfxBase64" text,
	"certificadoSenha" text,
	"serieNfe" text DEFAULT '001' NOT NULL,
	"proximoNumeroNfe" integer DEFAULT 1 NOT NULL,
	"serieNfce" text DEFAULT '001' NOT NULL,
	"proximoNumeroNfce" integer DEFAULT 1 NOT NULL,
	"focusNfeToken" text,
	"webhookUrl" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "FiscalSettings_restaurantId_unique" UNIQUE("restaurantId")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "LoyaltyPrize" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"restaurantId" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"pointsRequired" integer NOT NULL,
	"stock" integer,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "MarketingSettings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"restaurantId" uuid NOT NULL,
	"metaPixelId" text,
	"metaCapiToken" text,
	"ga4MeasurementId" text,
	"gtmContainerId" text,
	"abandonedCartEnabled" boolean DEFAULT true NOT NULL,
	"abandonedCartDelayMinutes" integer DEFAULT 120 NOT NULL,
	"abandonedCartCouponPercent" double precision DEFAULT 5 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "MarketingSettings_restaurantId_unique" UNIQUE("restaurantId")
);
--> statement-breakpoint
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
ALTER TABLE "AiSettings" ADD COLUMN "isBotPaused" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "AiSettings" ADD COLUMN "pausedAt" timestamp;--> statement-breakpoint
ALTER TABLE "AiSettings" ADD COLUMN "pausedForPhone" text;--> statement-breakpoint
ALTER TABLE "AiSettings" ADD COLUMN "conversationStatus" "ConversationStatus" DEFAULT 'BOT_ACTIVE' NOT NULL;--> statement-breakpoint
ALTER TABLE "FinancialTransaction" ADD COLUMN "bankAccountId" uuid;--> statement-breakpoint
ALTER TABLE "Order" ADD COLUMN "customerCpf" text;--> statement-breakpoint
ALTER TABLE "Order" ADD COLUMN "nfeStatus" "FiscalDocumentStatus";--> statement-breakpoint
ALTER TABLE "Order" ADD COLUMN "nfeAccessKey" text;--> statement-breakpoint
ALTER TABLE "Order" ADD COLUMN "nfeDanfeUrl" text;--> statement-breakpoint
ALTER TABLE "Order" ADD COLUMN "nfeRejectionReason" text;--> statement-breakpoint
ALTER TABLE "Order" ADD COLUMN "customerLedgerId" uuid;--> statement-breakpoint
ALTER TABLE "Restaurant" ADD COLUMN "scaleProtocol" text;--> statement-breakpoint
ALTER TABLE "Restaurant" ADD COLUMN "scaleBaudRate" integer DEFAULT 9600;--> statement-breakpoint
ALTER TABLE "Restaurant" ADD COLUMN "drawerPulseHex" text;--> statement-breakpoint
ALTER TABLE "Wallet" ADD COLUMN "creditBalance" double precision DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "Wallet" ADD COLUMN "points" double precision DEFAULT 0 NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "BankAccount" ADD CONSTRAINT "BankAccount_restaurantId_Restaurant_id_fk" FOREIGN KEY ("restaurantId") REFERENCES "public"."Restaurant"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "BankStatementEntry" ADD CONSTRAINT "BankStatementEntry_statementId_BankStatement_id_fk" FOREIGN KEY ("statementId") REFERENCES "public"."BankStatement"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "BankStatementEntry" ADD CONSTRAINT "BankStatementEntry_restaurantId_Restaurant_id_fk" FOREIGN KEY ("restaurantId") REFERENCES "public"."Restaurant"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "BankStatementEntry" ADD CONSTRAINT "BankStatementEntry_matchedTransactionId_FinancialTransaction_id_fk" FOREIGN KEY ("matchedTransactionId") REFERENCES "public"."FinancialTransaction"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "BankStatement" ADD CONSTRAINT "BankStatement_restaurantId_Restaurant_id_fk" FOREIGN KEY ("restaurantId") REFERENCES "public"."Restaurant"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "BankStatement" ADD CONSTRAINT "BankStatement_bankAccountId_BankAccount_id_fk" FOREIGN KEY ("bankAccountId") REFERENCES "public"."BankAccount"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "CustomerInteraction" ADD CONSTRAINT "CustomerInteraction_restaurantId_Restaurant_id_fk" FOREIGN KEY ("restaurantId") REFERENCES "public"."Restaurant"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "CustomerInteraction" ADD CONSTRAINT "CustomerInteraction_customerId_Customer_id_fk" FOREIGN KEY ("customerId") REFERENCES "public"."Customer"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "CustomerLedgerEntry" ADD CONSTRAINT "CustomerLedgerEntry_ledgerId_CustomerLedger_id_fk" FOREIGN KEY ("ledgerId") REFERENCES "public"."CustomerLedger"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "CustomerLedgerEntry" ADD CONSTRAINT "CustomerLedgerEntry_restaurantId_Restaurant_id_fk" FOREIGN KEY ("restaurantId") REFERENCES "public"."Restaurant"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "CustomerLedgerEntry" ADD CONSTRAINT "CustomerLedgerEntry_orderId_Order_id_fk" FOREIGN KEY ("orderId") REFERENCES "public"."Order"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "CustomerLedgerEntry" ADD CONSTRAINT "CustomerLedgerEntry_bankAccountId_BankAccount_id_fk" FOREIGN KEY ("bankAccountId") REFERENCES "public"."BankAccount"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "CustomerLedger" ADD CONSTRAINT "CustomerLedger_restaurantId_Restaurant_id_fk" FOREIGN KEY ("restaurantId") REFERENCES "public"."Restaurant"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Customer" ADD CONSTRAINT "Customer_restaurantId_Restaurant_id_fk" FOREIGN KEY ("restaurantId") REFERENCES "public"."Restaurant"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "FiscalSettings" ADD CONSTRAINT "FiscalSettings_restaurantId_Restaurant_id_fk" FOREIGN KEY ("restaurantId") REFERENCES "public"."Restaurant"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "LoyaltyPrize" ADD CONSTRAINT "LoyaltyPrize_restaurantId_Restaurant_id_fk" FOREIGN KEY ("restaurantId") REFERENCES "public"."Restaurant"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "MarketingSettings" ADD CONSTRAINT "MarketingSettings_restaurantId_Restaurant_id_fk" FOREIGN KEY ("restaurantId") REFERENCES "public"."Restaurant"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "MarketingSpend" ADD CONSTRAINT "MarketingSpend_restaurantId_Restaurant_id_fk" FOREIGN KEY ("restaurantId") REFERENCES "public"."Restaurant"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "customer_restaurant_phone_unique" ON "Customer" USING btree ("restaurantId","phone");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "FinancialTransaction" ADD CONSTRAINT "FinancialTransaction_bankAccountId_BankAccount_id_fk" FOREIGN KEY ("bankAccountId") REFERENCES "public"."BankAccount"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Order" ADD CONSTRAINT "Order_customerLedgerId_CustomerLedger_id_fk" FOREIGN KEY ("customerLedgerId") REFERENCES "public"."CustomerLedger"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
