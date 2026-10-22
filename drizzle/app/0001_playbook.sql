CREATE TYPE "app"."playbook_side" AS ENUM('attack', 'defense');--> statement-breakpoint
CREATE TABLE "app"."playbook_strategies" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer NOT NULL,
	"map_id" integer NOT NULL,
	"side" "app"."playbook_side" NOT NULL,
	"title" text NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"layers" jsonb NOT NULL,
	"linked_cluster_id" integer,
	"shared_with_players" boolean DEFAULT false NOT NULL,
	"created_by" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "app"."playbook_strategies" ADD CONSTRAINT "playbook_strategies_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "app"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "playbook_team_map_idx" ON "app"."playbook_strategies" USING btree ("team_id","map_id");