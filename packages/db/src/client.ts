import { drizzle } from "drizzle-orm/node-postgres";
import { Pool, types } from "pg";

import * as schema from "./schema";

// Parse PostgreSQL numeric/decimal (OID 1700) as float so money/numeric fields return numbers instead of strings
types.setTypeParser(1700, (val: string) => (val === null || val === undefined ? null : parseFloat(val)));

type Database = ReturnType<typeof drizzle<typeof schema>>;

export const AUTO_MIGRATIONS_SQL = `
  ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "acceptPix" boolean DEFAULT true NOT NULL;
  ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "pixKey" text;
  ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "pixMode" text DEFAULT 'QRCODE' NOT NULL;
  ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "onlinePaymentGateway" text DEFAULT 'MERCADO_PAGO' NOT NULL;
  ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "infinitePayHandle" text;
  ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "mercadoPagoAccessToken" text;
  ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "acceptValeRefeicao" boolean DEFAULT false NOT NULL;
  ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "acceptValeAlimentacao" boolean DEFAULT false NOT NULL;
  ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'INFINITEPAY';
  ALTER TYPE "MarketplaceType" ADD VALUE IF NOT EXISTS 'KEETA';
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

