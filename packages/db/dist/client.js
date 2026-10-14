import { drizzle } from "drizzle-orm/node-postgres";
import { Pool, types } from "pg";
import * as schema from "./schema";
// Parse PostgreSQL numeric/decimal (OID 1700) as float so money/numeric fields return numbers instead of strings
types.setTypeParser(1700, (val) => (val === null || val === undefined ? null : parseFloat(val)));
export const AUTO_MIGRATIONS_SQL = `
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
  ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'INFINITEPAY';
  ALTER TYPE "MarketplaceType" ADD VALUE IF NOT EXISTS 'KEETA';

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
`;
const globalForDb = globalThis;
export async function ensureAutoMigrations(customPool) {
    const targetPool = customPool || (globalForDb.fswPool ?? getOrCreateDb().pool);
    if (!globalForDb.fswMigrationPromise) {
        globalForDb.fswMigrationPromise = targetPool
            .query(AUTO_MIGRATIONS_SQL)
            .then(() => { })
            .catch((err) => {
            console.warn("⚠️ [AUTO_MIGRATIONS] Aviso na aplicação de colunas:", err?.message);
        });
    }
    return globalForDb.fswMigrationPromise;
}
function getOrCreateDb() {
    if (globalForDb.fswDb && globalForDb.fswPool) {
        return { db: globalForDb.fswDb, pool: globalForDb.fswPool };
    }
    const connectionString = process.env.DATABASE_URL ||
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
    ensureAutoMigrations(pool).catch(() => { });
    return { db, pool };
}
export const db = new Proxy({}, {
    get(_, prop) {
        return getOrCreateDb().db[prop];
    },
});
export const pool = new Proxy({}, {
    get(_, prop) {
        return getOrCreateDb().pool[prop];
    },
});
