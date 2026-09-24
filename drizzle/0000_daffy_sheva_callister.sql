CREATE TYPE "public"."page_state" AS ENUM('candidate', 'draft', 'published', 'indexable', 'noindex', 'merged', 'archived');--> statement-breakpoint
CREATE TYPE "public"."source_health" AS ENUM('healthy', 'degraded', 'failing', 'disabled');--> statement-breakpoint
CREATE TYPE "public"."verification_state" AS ENUM('verified', 'supported', 'conflicting', 'unverified', 'stale', 'rejected');--> statement-breakpoint
CREATE TABLE "changes" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"entity_id" bigint NOT NULL,
	"attribute_key" text NOT NULL,
	"attribute_label" text NOT NULL,
	"previous_value" text,
	"new_value" text,
	"source_key" text NOT NULL,
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "entities" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"long_description" text,
	"wikidata_id" text,
	"image_url" text,
	"image_alt" text,
	"image_width" integer,
	"image_height" integer,
	"verification" "verification_state" DEFAULT 'unverified' NOT NULL,
	"page_state" "page_state" DEFAULT 'candidate' NOT NULL,
	"indexable" boolean DEFAULT false NOT NULL,
	"quality_score" integer DEFAULT 0 NOT NULL,
	"quality_reasons" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"content_hash" text,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_verified_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "entities_slug_unique" UNIQUE("slug"),
	CONSTRAINT "entities_wikidata_id_unique" UNIQUE("wikidata_id")
);
--> statement-breakpoint
CREATE TABLE "entity_aliases" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"entity_id" bigint NOT NULL,
	"alias" text NOT NULL,
	"normalized" text NOT NULL,
	"source" text
);
--> statement-breakpoint
CREATE TABLE "entity_attributes" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"entity_id" bigint NOT NULL,
	"key" text NOT NULL,
	"label" text NOT NULL,
	"value" text NOT NULL,
	"numeric" double precision,
	"unit" text,
	"kind" text DEFAULT 'text' NOT NULL,
	"verification" "verification_state" DEFAULT 'unverified' NOT NULL,
	"provenance" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"observed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "entity_relationships" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"from_id" bigint NOT NULL,
	"to_id" bigint NOT NULL,
	"type" text DEFAULT 'related' NOT NULL,
	"weight" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "observations" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"entity_id" bigint NOT NULL,
	"attribute_key" text NOT NULL,
	"value" text NOT NULL,
	"numeric" double precision,
	"unit" text,
	"source_key" text NOT NULL,
	"source_url" text NOT NULL,
	"fetch_id" bigint,
	"value_hash" text NOT NULL,
	"parser_version" text DEFAULT '1' NOT NULL,
	"retrieved_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "search_queries" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"query" text NOT NULL,
	"normalized" text NOT NULL,
	"results" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "source_fetches" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"source_key" text NOT NULL,
	"url" text NOT NULL,
	"http_status" integer,
	"ok" boolean DEFAULT false NOT NULL,
	"content_hash" text,
	"parser_version" text DEFAULT '1' NOT NULL,
	"bytes" integer,
	"error" text,
	"retrieved_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sources" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"homepage" text,
	"license" text,
	"trust" integer DEFAULT 50 NOT NULL,
	"health" "source_health" DEFAULT 'healthy' NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"error_count" integer DEFAULT 0 NOT NULL,
	"last_success_at" timestamp with time zone,
	"last_error_at" timestamp with time zone,
	"parser_version" text DEFAULT '1' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sources_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "system_events" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"level" text DEFAULT 'info' NOT NULL,
	"event" text NOT NULL,
	"job_id" text,
	"source_key" text,
	"entity_id" bigint,
	"duration_ms" integer,
	"data" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "topic_entities" (
	"topic_id" bigint NOT NULL,
	"entity_id" bigint NOT NULL,
	CONSTRAINT "topic_entities_topic_id_entity_id_pk" PRIMARY KEY("topic_id","entity_id")
);
--> statement-breakpoint
CREATE TABLE "topics" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "topics_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "changes" ADD CONSTRAINT "changes_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entity_aliases" ADD CONSTRAINT "entity_aliases_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entity_attributes" ADD CONSTRAINT "entity_attributes_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entity_relationships" ADD CONSTRAINT "entity_relationships_from_id_entities_id_fk" FOREIGN KEY ("from_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entity_relationships" ADD CONSTRAINT "entity_relationships_to_id_entities_id_fk" FOREIGN KEY ("to_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "observations" ADD CONSTRAINT "observations_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "observations" ADD CONSTRAINT "observations_fetch_id_source_fetches_id_fk" FOREIGN KEY ("fetch_id") REFERENCES "public"."source_fetches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "topic_entities" ADD CONSTRAINT "topic_entities_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "topic_entities" ADD CONSTRAINT "topic_entities_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "changes_entity_idx" ON "changes" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "changes_changed_idx" ON "changes" USING btree ("changed_at");--> statement-breakpoint
CREATE INDEX "entities_page_state_idx" ON "entities" USING btree ("page_state");--> statement-breakpoint
CREATE INDEX "entities_indexable_idx" ON "entities" USING btree ("indexable");--> statement-breakpoint
CREATE INDEX "entities_updated_idx" ON "entities" USING btree ("updated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "entity_aliases_uq" ON "entity_aliases" USING btree ("entity_id","normalized");--> statement-breakpoint
CREATE INDEX "entity_aliases_norm_idx" ON "entity_aliases" USING btree ("normalized");--> statement-breakpoint
CREATE UNIQUE INDEX "entity_attributes_uq" ON "entity_attributes" USING btree ("entity_id","key");--> statement-breakpoint
CREATE INDEX "entity_attributes_key_idx" ON "entity_attributes" USING btree ("key");--> statement-breakpoint
CREATE UNIQUE INDEX "entity_relationships_uq" ON "entity_relationships" USING btree ("from_id","to_id","type");--> statement-breakpoint
CREATE INDEX "entity_relationships_from_idx" ON "entity_relationships" USING btree ("from_id");--> statement-breakpoint
CREATE INDEX "observations_entity_attr_idx" ON "observations" USING btree ("entity_id","attribute_key");--> statement-breakpoint
CREATE INDEX "observations_retrieved_idx" ON "observations" USING btree ("retrieved_at");--> statement-breakpoint
CREATE INDEX "search_queries_norm_idx" ON "search_queries" USING btree ("normalized");--> statement-breakpoint
CREATE INDEX "search_queries_created_idx" ON "search_queries" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "source_fetches_source_idx" ON "source_fetches" USING btree ("source_key");--> statement-breakpoint
CREATE INDEX "source_fetches_retrieved_idx" ON "source_fetches" USING btree ("retrieved_at");--> statement-breakpoint
CREATE INDEX "system_events_created_idx" ON "system_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "system_events_event_idx" ON "system_events" USING btree ("event");