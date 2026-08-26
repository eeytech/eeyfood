import path from "node:path";
import { fileURLToPath } from "node:url";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db, pool } from "./client";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigrate() {
  process.stdout.write("⏳ Rodando migrações do banco de dados...\n");

  const migrationsFolder = path.resolve(__dirname, "../drizzle");

  await migrate(db, { migrationsFolder });

  process.stdout.write("✅ Migrações concluídas com sucesso!\n");
  await pool.end();
}

runMigrate().catch((error: unknown) => {
  process.stderr.write(`❌ Falha ao executar migrações: ${String(error)}\n`);
  process.exit(1);
});
