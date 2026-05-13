import { Pool } from "pg";
import * as schema from "./schema.js";
declare const db: import("drizzle-orm/node-postgres").NodePgDatabase<typeof schema> & {
    $client: Pool;
};
declare const pool: Pool;
export { db, pool };
