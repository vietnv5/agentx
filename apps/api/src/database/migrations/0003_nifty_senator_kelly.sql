CREATE TYPE "public"."storage_provider" AS ENUM('local', 's3');--> statement-breakpoint
CREATE TABLE "files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"filename" varchar(255) NOT NULL,
	"path" text NOT NULL,
	"url" text NOT NULL,
	"mime_type" varchar(100),
	"size_bytes" integer,
	"provider" "storage_provider" DEFAULT 'local' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "project_agents" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "project_knowledge_documents" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "projects" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "project_agents" CASCADE;--> statement-breakpoint
DROP TABLE "project_knowledge_documents" CASCADE;--> statement-breakpoint
DROP TABLE "projects" CASCADE;--> statement-breakpoint
DROP INDEX "idx_conversations_project";--> statement-breakpoint
DROP INDEX "idx_tool_defs_name_unique";--> statement-breakpoint
ALTER TABLE "knowledge_chunks" ALTER COLUMN "embedding" SET DATA TYPE vector(768);--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "attachments" jsonb DEFAULT '[]';--> statement-breakpoint
ALTER TABLE "tool_definitions" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_tool_defs_name_unique" ON "tool_definitions" USING btree ("integration_id","tool_name");--> statement-breakpoint
ALTER TABLE "conversations" DROP COLUMN "project_id";