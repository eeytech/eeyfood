ALTER TABLE "Restaurant" ADD COLUMN "isOrderSchedulingEnabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "Restaurant" ADD COLUMN "schedulingMinAdvanceMinutes" integer DEFAULT 45 NOT NULL;--> statement-breakpoint
ALTER TABLE "Restaurant" ADD COLUMN "schedulingSlotIntervalMinutes" integer DEFAULT 30 NOT NULL;--> statement-breakpoint
ALTER TABLE "Restaurant" ADD COLUMN "schedulingMaxDays" integer DEFAULT 3 NOT NULL;--> statement-breakpoint
ALTER TABLE "Restaurant" ADD COLUMN "schedulingHoursMode" text DEFAULT 'OPERATING_HOURS' NOT NULL;--> statement-breakpoint
ALTER TABLE "Restaurant" ADD COLUMN "schedulingCustomStartTime" text DEFAULT '11:00';--> statement-breakpoint
ALTER TABLE "Restaurant" ADD COLUMN "schedulingCustomEndTime" text DEFAULT '23:00';