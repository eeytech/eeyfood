ALTER TABLE "FiscalSettings" ADD COLUMN IF NOT EXISTS "acbrClientId" text;--> statement-breakpoint
ALTER TABLE "FiscalSettings" ADD COLUMN IF NOT EXISTS "acbrClientSecret" text;--> statement-breakpoint
ALTER TABLE "FiscalSettings" ADD COLUMN IF NOT EXISTS "acbrToken" text;--> statement-breakpoint
ALTER TABLE "FiscalSettings" ADD COLUMN IF NOT EXISTS "acbrTokenExpiresAt" timestamp;--> statement-breakpoint
ALTER TABLE "FiscalSettings" ADD COLUMN IF NOT EXISTS "tipoDocumentoPadrao" text DEFAULT 'NFCE' NOT NULL;--> statement-breakpoint
ALTER TABLE "FiscalSettings" ADD COLUMN IF NOT EXISTS "inscricaoMunicipal" text;--> statement-breakpoint
ALTER TABLE "FiscalSettings" ADD COLUMN IF NOT EXISTS "codigoMunicipio" text;--> statement-breakpoint
ALTER TABLE "FiscalSettings" ADD COLUMN IF NOT EXISTS "cscId" text;--> statement-breakpoint
ALTER TABLE "FiscalSettings" ADD COLUMN IF NOT EXISTS "cscCodigo" text;--> statement-breakpoint
ALTER TABLE "FiscalSettings" ADD COLUMN IF NOT EXISTS "regimeTributario" text DEFAULT 'SIMPLES_NACIONAL';--> statement-breakpoint
ALTER TABLE "FiscalSettings" ADD COLUMN IF NOT EXISTS "provedorNfse" text DEFAULT 'padrao';--> statement-breakpoint
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "nfeDocumentoId" text;
