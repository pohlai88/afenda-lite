ALTER TABLE "md_party_relationship" RENAME COLUMN "from_party_id" TO "source_party_id";
--> statement-breakpoint
ALTER TABLE "md_party_relationship" RENAME COLUMN "to_party_id" TO "target_party_id";
--> statement-breakpoint
ALTER TABLE "md_party_relationship" RENAME COLUMN "valid_from" TO "effective_from";
--> statement-breakpoint
ALTER TABLE "md_party_relationship" RENAME COLUMN "valid_to" TO "effective_to";
--> statement-breakpoint
ALTER TABLE "md_party_relationship" ADD COLUMN "direction" text;
--> statement-breakpoint
UPDATE "md_party_relationship"
SET "direction" = CASE
	WHEN "relationship_type" IN ('parent_of', 'subsidiary_of') THEN 'hierarchical'
	WHEN "relationship_type" IN ('landlord_of', 'tenant_of') THEN 'reciprocal'
	WHEN "relationship_type" = 'related_party' THEN 'symmetric'
	ELSE 'directional'
END;
--> statement-breakpoint
DROP INDEX "md_party_relationship_org_pair_type_uidx";
--> statement-breakpoint
UPDATE "md_party_relationship"
SET "source_party_id" = "target_party_id",
	"target_party_id" = "source_party_id",
	"relationship_type" = 'parent_of'
WHERE "relationship_type" = 'subsidiary_of';
--> statement-breakpoint
UPDATE "md_party_relationship"
SET "source_party_id" = "target_party_id",
	"target_party_id" = "source_party_id",
	"relationship_type" = 'landlord_of'
WHERE "relationship_type" = 'tenant_of';
--> statement-breakpoint
UPDATE "md_party_relationship"
SET "source_party_id" = LEAST("source_party_id", "target_party_id"),
	"target_party_id" = GREATEST("source_party_id", "target_party_id")
WHERE "relationship_type" = 'related_party';
--> statement-breakpoint
WITH ranked AS (
	SELECT "id",
		row_number() OVER (
			PARTITION BY "organization_id", "source_party_id", "target_party_id", "relationship_type"
			ORDER BY "created_at", "id"
		) AS occurrence
	FROM "md_party_relationship"
	WHERE "status" = 'active' AND "archived_at" IS NULL
)
UPDATE "md_party_relationship" AS relationship
SET "status" = 'inactive',
	"version" = "version" + 1,
	"updated_at" = now()
FROM ranked
WHERE ranked."id" = relationship."id" AND ranked.occurrence > 1;
--> statement-breakpoint
ALTER TABLE "md_party_relationship" ALTER COLUMN "direction" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "md_party_relationship" ADD CONSTRAINT "md_party_relationship_non_reflexive_ck"
	CHECK ("source_party_id" <> "target_party_id");
--> statement-breakpoint
ALTER TABLE "md_party_relationship" ADD CONSTRAINT "md_party_relationship_direction_ck"
	CHECK ("direction" IN ('directional', 'reciprocal', 'hierarchical', 'symmetric'));
--> statement-breakpoint
ALTER TABLE "md_party_relationship" ADD CONSTRAINT "md_party_relationship_type_ck"
	CHECK ("relationship_type" IN (
		'parent_of', 'owned_by', 'contact_for', 'bill_to_for', 'ship_to_for',
		'supplies', 'distributes_for', 'franchisee_of', 'related_party', 'landlord_of'
	));
--> statement-breakpoint
ALTER TABLE "md_party_relationship" ADD CONSTRAINT "md_party_relationship_semantics_ck"
	CHECK (
		("relationship_type" = 'parent_of' AND "direction" = 'hierarchical')
		OR ("relationship_type" = 'landlord_of' AND "direction" = 'reciprocal')
		OR ("relationship_type" = 'related_party' AND "direction" = 'symmetric')
		OR ("relationship_type" IN (
			'owned_by', 'contact_for', 'bill_to_for', 'ship_to_for',
			'supplies', 'distributes_for', 'franchisee_of'
		) AND "direction" = 'directional')
	);
--> statement-breakpoint
ALTER TABLE "md_party_relationship" ADD CONSTRAINT "md_party_relationship_status_ck"
	CHECK ("status" IN ('draft', 'active', 'inactive', 'terminated', 'archived'));
--> statement-breakpoint
ALTER TABLE "md_party_relationship" ADD CONSTRAINT "md_party_relationship_effective_range_ck"
	CHECK ("effective_to" IS NULL OR "effective_from" IS NULL OR "effective_to" >= "effective_from");
--> statement-breakpoint
CREATE UNIQUE INDEX "md_party_relationship_active_pair_type_uidx"
	ON "md_party_relationship" USING btree (
		"organization_id", "source_party_id", "target_party_id", "relationship_type"
	)
	WHERE "status" = 'active' AND "archived_at" IS NULL;
