import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema.js";
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
