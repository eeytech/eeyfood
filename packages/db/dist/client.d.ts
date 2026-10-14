import { Pool } from "pg";
import * as schema from "./schema";
export declare const AUTO_MIGRATIONS_SQL = "\n  ALTER TABLE \"Restaurant\" ADD COLUMN IF NOT EXISTS \"acceptPix\" boolean DEFAULT true NOT NULL;\n  ALTER TABLE \"Restaurant\" ADD COLUMN IF NOT EXISTS \"pixKey\" text;\n  ALTER TABLE \"Restaurant\" ADD COLUMN IF NOT EXISTS \"pixMode\" text DEFAULT 'QRCODE' NOT NULL;\n  ALTER TABLE \"Restaurant\" ADD COLUMN IF NOT EXISTS \"onlinePaymentGateway\" text DEFAULT 'MERCADO_PAGO' NOT NULL;\n  ALTER TABLE \"Restaurant\" ADD COLUMN IF NOT EXISTS \"infinitePayHandle\" text;\n  ALTER TABLE \"Restaurant\" ADD COLUMN IF NOT EXISTS \"mercadoPagoAccessToken\" text;\n  ALTER TABLE \"Restaurant\" ADD COLUMN IF NOT EXISTS \"acceptValeRefeicao\" boolean DEFAULT false NOT NULL;\n  ALTER TABLE \"Restaurant\" ADD COLUMN IF NOT EXISTS \"acceptValeAlimentacao\" boolean DEFAULT false NOT NULL;\n  ALTER TYPE \"PaymentMethod\" ADD VALUE IF NOT EXISTS 'INFINITEPAY';\n  ALTER TYPE \"MarketplaceType\" ADD VALUE IF NOT EXISTS 'KEETA';\n";
export declare function ensureAutoMigrations(customPool?: Pool): Promise<void>;
export declare const db: import("drizzle-orm/node-postgres").NodePgDatabase<typeof schema> & {
    $client: Pool;
};
export declare const pool: Pool;
