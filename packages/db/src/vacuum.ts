import { sql } from "drizzle-orm";
import { db, pool } from "./client";

async function runVacuum() {
  process.stdout.write("🧹 Executando VACUUM ANALYZE no banco de dados...\n");

  await db.execute(sql`VACUUM ANALYZE;`);

  process.stdout.write("✅ VACUUM ANALYZE concluído com sucesso!\n");
  await pool.end();
}

runVacuum().catch((error: unknown) => {
  process.stderr.write(`❌ Falha ao executar VACUUM ANALYZE: ${String(error)}\n`);
  process.exit(1);
});
