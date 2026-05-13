import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "./schema.js";

type Database = ReturnType<typeof drizzle<typeof schema>>;

const globalForDb = globalThis as typeof globalThis & {
  fswPool?: Pool;
  fswDb?: Database;
};

const criarConexao = () => {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("A variável DATABASE_URL não foi configurada.");
  }

  const pool =
    globalForDb.fswPool ??
    new Pool({
      connectionString,
    });

  const currentDb = globalForDb.fswDb ?? drizzle(pool, { schema });

  if (process.env.NODE_ENV !== "production") {
    globalForDb.fswPool = pool;
    globalForDb.fswDb = currentDb;
  }

  return {
    pool,
    db: currentDb,
  };
};

const getDb = () => {
  return criarConexao().db;
};

const getPool = () => {
  return criarConexao().pool;
};

const db = new Proxy({} as Database, {
  get(_target, property, receiver) {
    const currentDb = getDb();
    const value = Reflect.get(currentDb, property, receiver);

    return typeof value === "function" ? value.bind(currentDb) : value;
  },
});

const pool = new Proxy({} as Pool, {
  get(_target, property, receiver) {
    const currentPool = getPool();
    const value = Reflect.get(currentPool, property, receiver);

    return typeof value === "function" ? value.bind(currentPool) : value;
  },
});

export { db, pool };
