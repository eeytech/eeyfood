import { drizzle } from "drizzle-orm/node-postgres";
import { Pool, types } from "pg";
import * as schema from "./schema";
// Parse PostgreSQL numeric/decimal (OID 1700) as float so money/numeric fields return numbers instead of strings
types.setTypeParser(1700, (val) => (val === null || val === undefined ? null : parseFloat(val)));
const globalForDb = globalThis;
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
    pool
        .query('ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "acceptPix" boolean DEFAULT true NOT NULL; ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "pixKey" text; ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "pixMode" text DEFAULT \'QRCODE\' NOT NULL; ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "onlinePaymentGateway" text DEFAULT \'MERCADO_PAGO\' NOT NULL; ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "infinitePayHandle" text; ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS \'INFINITEPAY\'; ALTER TYPE "MarketplaceType" ADD VALUE IF NOT EXISTS \'KEETA\';')
        .catch(() => { });
    globalForDb.fswPool = pool;
    globalForDb.fswDb = db;
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
