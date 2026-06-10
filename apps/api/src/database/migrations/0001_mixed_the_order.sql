ALTER TYPE "public"."transport_type" ADD VALUE 'http';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "deleted" boolean DEFAULT false NOT NULL;