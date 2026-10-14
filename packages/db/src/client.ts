import { drizzle } from "drizzle-orm/node-postgres";
import { Pool, types } from "pg";

import * as schema from "./schema";

// Parse PostgreSQL numeric/decimal (OID 1700) as float so money/numeric fields return numbers instead of strings
types.setTypeParser(1700, (val: string) => (val === null || val === undefined ? null : parseFloat(val)));

type Database = ReturnType<typeof drizzle<typeof schema>>;

export const AUTO_MIGRATIONS_SQL = `
  -- ── Restaurant Extensions ──────────────────────────────────────────────
  ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "acceptPix" boolean DEFAULT true NOT NULL;
  ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "pixKey" text;
  ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "pixMode" text DEFAULT 'QRCODE' NOT NULL;
  ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "onlinePaymentGateway" text DEFAULT 'MERCADO_PAGO' NOT NULL;
  ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "infinitePayHandle" text;
  ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "mercadoPagoAccessToken" text;
  ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "acceptValeRefeicao" boolean DEFAULT false NOT NULL;
  ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "acceptValeAlimentacao" boolean DEFAULT false NOT NULL;
  ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "showPromotionalBanners" boolean DEFAULT true NOT NULL;
  ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "promotionalBanners" jsonb;
  ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "planName" text DEFAULT 'COMPLETO' NOT NULL;
  ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "enabledModules" jsonb;
  ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "isOrderSchedulingEnabled" boolean DEFAULT true NOT NULL;
  ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "schedulingMinAdvanceMinutes" integer DEFAULT 45 NOT NULL;
  ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "schedulingSlotIntervalMinutes" integer DEFAULT 30 NOT NULL;
  ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "schedulingMaxDays" integer DEFAULT 3 NOT NULL;
  ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "schedulingHoursMode" text DEFAULT 'OPERATING_HOURS' NOT NULL;
  ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "schedulingCustomStartTime" text DEFAULT '11:00';
  ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "schedulingCustomEndTime" text DEFAULT '23:00';

  -- ── Enums ───────────────────────────────────────────────────────────────
  ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'INFINITEPAY';
  ALTER TYPE "MarketplaceType" ADD VALUE IF NOT EXISTS 'KEETA';
  ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'PANEL';
  ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'COURIER';

  DO $$ BEGIN
    CREATE TYPE "PrinterRole" AS ENUM ('KITCHEN', 'CASHIER', 'BAR', 'BOTH');
  EXCEPTION
    WHEN duplicate_object THEN null;
  END $$;

  DO $$ BEGIN
    CREATE TYPE "PrinterConnectionType" AS ENUM ('NETWORK_TCP', 'WINDOWS_SPOOLER', 'BROWSER', 'LOCAL_AGENT');
  EXCEPTION
    WHEN duplicate_object THEN null;
  END $$;

  DO $$ BEGIN
    CREATE TYPE "FiscalDocumentStatus" AS ENUM ('DRAFT', 'PENDING', 'AUTHORIZED', 'REJECTED', 'CANCELLED', 'ERROR');
  EXCEPTION
    WHEN duplicate_object THEN null;
  END $$;

  DO $$ BEGIN
    CREATE TYPE "TicketCategory" AS ENUM ('PDV_CAIXA', 'KDS_COZINHA', 'CARDAPIO_ESTOQUE', 'IMPRESSAO_HARDWARE', 'FINANCEIRO_FISCAL', 'INTEGRACOES', 'OUTRO');
  EXCEPTION
    WHEN duplicate_object THEN null;
  END $$;

  DO $$ BEGIN
    CREATE TYPE "TicketPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');
  EXCEPTION
    WHEN duplicate_object THEN null;
  END $$;

  DO $$ BEGIN
    CREATE TYPE "TicketSender" AS ENUM ('USER', 'SUPPORT');
  EXCEPTION
    WHEN duplicate_object THEN null;
  END $$;

  DO $$ BEGIN
    CREATE TYPE "TicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'WAITING_CUSTOMER', 'RESOLVED', 'CLOSED');
  EXCEPTION
    WHEN duplicate_object THEN null;
  END $$;

  -- ── Order Extensions (NF-e, ACBr, comprovante, taxas, agendamento) ──────
  ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "nfeDocumentoId" text;
  ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "nfeStatus" "FiscalDocumentStatus";
  ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "nfeAccessKey" text;
  ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "nfeDanfeUrl" text;
  ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "nfeRejectionReason" text;
  ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "customerCpf" text;
  ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "serviceFeePercent" double precision;
  ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "serviceFeeAmount" numeric(10, 2) DEFAULT 0 NOT NULL;
  ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "paymentSplits" jsonb;
  ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "brandName" text;
  ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "brandColor" text;
  ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "cashRegisterShiftId" uuid;
  ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "customerLedgerId" uuid;
  ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "customerAddressId" uuid;
  ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "deliveryProofUrl" text;
  ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "deliveryConfirmationLatitude" double precision;
  ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "deliveryConfirmationLongitude" double precision;
  ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "marketplaceOrderId" text;
  ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "marketplaceType" "MarketplaceType";
  ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "scheduledFor" timestamp;
  ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "diningTableId" uuid;
  ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "courierId" uuid;
  ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "dispatchedAt" timestamp;
  ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "deliveredAt" timestamp;
  ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "couponDiscountAmount" numeric(10, 2) DEFAULT 0 NOT NULL;
  ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "cashbackRedeemedAmount" numeric(10, 2) DEFAULT 0 NOT NULL;
  ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "cashbackEarnedAmount" numeric(10, 2) DEFAULT 0 NOT NULL;
  ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "couponId" uuid;
  ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "couponCode" text;
  ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "cashbackCreditedAt" timestamp;

  -- ── FiscalSettings (ACBr API OAuth 2.0 & credenciais fiscais) ───────────
  CREATE TABLE IF NOT EXISTS "FiscalSettings" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "restaurantId" uuid NOT NULL UNIQUE REFERENCES "Restaurant"("id") ON DELETE cascade,
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
    "acbrClientId" text,
    "acbrClientSecret" text,
    "acbrToken" text,
    "acbrTokenExpiresAt" timestamp,
    "tipoDocumentoPadrao" text DEFAULT 'NFCE' NOT NULL,
    "inscricaoMunicipal" text,
    "codigoMunicipio" text,
    "cscId" text,
    "cscCodigo" text,
    "regimeTributario" text DEFAULT 'SIMPLES_NACIONAL',
    "provedorNfse" text DEFAULT 'padrao',
    "createdAt" timestamp DEFAULT now() NOT NULL,
    "updatedAt" timestamp DEFAULT now() NOT NULL
  );

  ALTER TABLE "FiscalSettings" ADD COLUMN IF NOT EXISTS "acbrClientId" text;
  ALTER TABLE "FiscalSettings" ADD COLUMN IF NOT EXISTS "acbrClientSecret" text;
  ALTER TABLE "FiscalSettings" ADD COLUMN IF NOT EXISTS "acbrToken" text;
  ALTER TABLE "FiscalSettings" ADD COLUMN IF NOT EXISTS "acbrTokenExpiresAt" timestamp;
  ALTER TABLE "FiscalSettings" ADD COLUMN IF NOT EXISTS "tipoDocumentoPadrao" text DEFAULT 'NFCE' NOT NULL;
  ALTER TABLE "FiscalSettings" ADD COLUMN IF NOT EXISTS "inscricaoMunicipal" text;
  ALTER TABLE "FiscalSettings" ADD COLUMN IF NOT EXISTS "codigoMunicipio" text;
  ALTER TABLE "FiscalSettings" ADD COLUMN IF NOT EXISTS "cscId" text;
  ALTER TABLE "FiscalSettings" ADD COLUMN IF NOT EXISTS "cscCodigo" text;
  ALTER TABLE "FiscalSettings" ADD COLUMN IF NOT EXISTS "regimeTributario" text DEFAULT 'SIMPLES_NACIONAL';
  ALTER TABLE "FiscalSettings" ADD COLUMN IF NOT EXISTS "provedorNfse" text DEFAULT 'padrao';

  -- ── RestaurantPrinter ───────────────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS "RestaurantPrinter" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "restaurantId" uuid NOT NULL REFERENCES "Restaurant"("id") ON DELETE CASCADE,
    "name" text NOT NULL,
    "role" "PrinterRole" DEFAULT 'KITCHEN' NOT NULL,
    "connectionType" "PrinterConnectionType" DEFAULT 'NETWORK_TCP' NOT NULL,
    "ipAddress" text,
    "port" integer DEFAULT 9100 NOT NULL,
    "spoolerName" text,
    "paperWidth" integer DEFAULT 80 NOT NULL,
    "cutPaper" boolean DEFAULT true NOT NULL,
    "openDrawer" boolean DEFAULT false NOT NULL,
    "copies" integer DEFAULT 1 NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "autoPrintOnNewOrder" boolean DEFAULT true NOT NULL,
    "printPrices" boolean DEFAULT false NOT NULL,
    "printCustomerDetails" boolean DEFAULT true NOT NULL,
    "printObservations" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp DEFAULT now() NOT NULL,
    "updatedAt" timestamp DEFAULT now() NOT NULL
  );

  -- ── AiSettings & AiCustomerHandoff ──────────────────────────────────────
  ALTER TABLE "AiSettings" ADD COLUMN IF NOT EXISTS "aiProvider" text DEFAULT 'GOOGLE_GEMINI' NOT NULL;
  ALTER TABLE "AiSettings" ADD COLUMN IF NOT EXISTS "geminiApiKey" text;
  ALTER TABLE "AiSettings" ADD COLUMN IF NOT EXISTS "groqApiKey" text;
  ALTER TABLE "AiSettings" ADD COLUMN IF NOT EXISTS "openaiApiKey" text;
  ALTER TABLE "AiSettings" ADD COLUMN IF NOT EXISTS "evolutionInstanceName" text;
  ALTER TABLE "AiSettings" ADD COLUMN IF NOT EXISTS "evolutionApiKey" text;
  ALTER TABLE "AiSettings" ADD COLUMN IF NOT EXISTS "botName" text DEFAULT 'EeyFood Bot' NOT NULL;
  ALTER TABLE "AiSettings" ADD COLUMN IF NOT EXISTS "isBotActive" boolean DEFAULT false NOT NULL;
  ALTER TABLE "AiSettings" ADD COLUMN IF NOT EXISTS "isBotPaused" boolean DEFAULT false NOT NULL;
  ALTER TABLE "AiSettings" ADD COLUMN IF NOT EXISTS "pausedAt" timestamp;
  ALTER TABLE "AiSettings" ADD COLUMN IF NOT EXISTS "pausedForPhone" text;

  CREATE TABLE IF NOT EXISTS "AiCustomerHandoff" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "restaurantId" uuid NOT NULL REFERENCES "Restaurant"("id") ON DELETE cascade,
    "customerPhone" text NOT NULL,
    "customerName" text,
    "pausedAt" timestamp DEFAULT now() NOT NULL,
    "status" text DEFAULT 'WAITING_HUMAN' NOT NULL,
    "createdAt" timestamp DEFAULT now() NOT NULL,
    "updatedAt" timestamp DEFAULT now() NOT NULL
  );

  -- ── Support Tickets ─────────────────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS "SupportTicket" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "restaurantId" uuid REFERENCES "Restaurant"("id") ON DELETE cascade,
    "protocol" text NOT NULL UNIQUE,
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
    "updatedAt" timestamp DEFAULT now() NOT NULL
  );

  CREATE TABLE IF NOT EXISTS "SupportTicketMessage" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "ticketId" uuid NOT NULL REFERENCES "SupportTicket"("id") ON DELETE cascade,
    "sender" "TicketSender" NOT NULL,
    "senderName" text NOT NULL,
    "content" text NOT NULL,
    "createdAt" timestamp DEFAULT now() NOT NULL
  );

  -- ── Free Delivery Rules & Customer Address ──────────────────────────────
  CREATE TABLE IF NOT EXISTS "FreeDeliveryRule" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "restaurantId" uuid NOT NULL REFERENCES "Restaurant"("id") ON DELETE cascade,
    "name" text NOT NULL,
    "criterion" text DEFAULT 'MIN_ORDER_VALUE' NOT NULL,
    "minOrderValue" numeric(10, 2) DEFAULT 0 NOT NULL,
    "menuCategoryId" uuid REFERENCES "MenuCategory"("id") ON DELETE cascade,
    "productId" uuid REFERENCES "Product"("id") ON DELETE cascade,
    "isActive" boolean DEFAULT true NOT NULL,
    "startsAt" timestamp,
    "endsAt" timestamp,
    "createdAt" timestamp DEFAULT now() NOT NULL,
    "updatedAt" timestamp DEFAULT now() NOT NULL
  );

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
  CREATE INDEX IF NOT EXISTS "customer_address_phone_idx" ON "CustomerAddress" ("customerPhone");
`;

const globalForDb = globalThis as typeof globalThis & {
  fswPool?: Pool;
  fswDb?: Database;
  fswMigrationPromise?: Promise<void>;
};

export async function ensureAutoMigrations(customPool?: Pool): Promise<void> {
  const targetPool = customPool || (globalForDb.fswPool ?? getOrCreateDb().pool);
  if (!globalForDb.fswMigrationPromise) {
    globalForDb.fswMigrationPromise = targetPool
      .query(AUTO_MIGRATIONS_SQL)
      .then(() => {})
      .catch((err) => {
        console.warn("⚠️ [AUTO_MIGRATIONS] Aviso na aplicação de colunas:", err?.message);
      });
  }
  return globalForDb.fswMigrationPromise;
}

function getOrCreateDb(): { db: Database; pool: Pool } {
  if (globalForDb.fswDb && globalForDb.fswPool) {
    return { db: globalForDb.fswDb, pool: globalForDb.fswPool };
  }

  const connectionString =
    process.env.DATABASE_URL ||
    "postgresql://postgres:postgres@localhost:5432/eeyfood_db";

  const pool = new Pool({
    connectionString,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });

  const db = drizzle(pool, { schema });

  globalForDb.fswPool = pool;
  globalForDb.fswDb = db;

  ensureAutoMigrations(pool).catch(() => {});

  return { db, pool };
}

export const db = new Proxy({} as Database, {
  get(_, prop) {
    return getOrCreateDb().db[prop as keyof Database];
  },
});

export const pool = new Proxy({} as Pool, {
  get(_, prop) {
    return getOrCreateDb().pool[prop as keyof Pool];
  },
});

