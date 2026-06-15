import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "./schema.js";

type Database = ReturnType<typeof drizzle<typeof schema>>;

const globalForDb = globalThis as typeof globalThis & {
  fswPool?: Pool;
  fswDb?: Database;
};

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("A variável DATABASE_URL não foi configurada.");
}

const pool =
  globalForDb.fswPool ??
  new Pool({
    connectionString,
    max: 20, // Aumentando um pouco o limite padrão
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });

const db = globalForDb.fswDb ?? drizzle(pool, { schema });

if (process.env.NODE_ENV !== "production") {
  globalForDb.fswPool = pool;
  globalForDb.fswDb = db;
} else {
  // Em produção também é importante manter a referência global se o módulo for recarregado
  // ou se houver múltiplas entradas que importam este arquivo em um ambiente que não isola globais perfeitamente
  globalForDb.fswPool = pool;
  globalForDb.fswDb = db;
}

export { db, pool };
