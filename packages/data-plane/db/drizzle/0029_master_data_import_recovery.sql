ALTER TABLE md_import_batch
	DROP CONSTRAINT IF EXISTS md_import_batch_status_ck;--> statement-breakpoint

ALTER TABLE md_import_batch
	ADD COLUMN IF NOT EXISTS payload_hash text,
	ADD COLUMN IF NOT EXISTS operation_type text,
	ADD COLUMN IF NOT EXISTS lease_owner text,
	ADD COLUMN IF NOT EXISTS lease_expires_at timestamp with time zone,
	ADD COLUMN IF NOT EXISTS completed_at timestamp with time zone;--> statement-breakpoint

UPDATE md_import_batch
SET
	payload_hash = COALESCE(payload_hash, 'legacy:' || id::text),
	operation_type = COALESCE(operation_type, 'upsert_' || entity_type || '_by_code'),
	status = CASE status
		WHEN 'draft' THEN 'claimed'
		WHEN 'submitted' THEN 'approval_pending'
		WHEN 'rejected' THEN 'cancelled'
		WHEN 'expired' THEN 'cancelled'
		WHEN 'superseded' THEN 'cancelled'
		ELSE status
	END,
	completed_at = CASE
		WHEN status = 'applied' THEN COALESCE(completed_at, updated_at)
		ELSE completed_at
	END
WHERE payload_hash IS NULL
	OR operation_type IS NULL
	OR status IN ('draft', 'submitted', 'rejected', 'expired', 'superseded')
	OR (status = 'applied' AND completed_at IS NULL);--> statement-breakpoint

ALTER TABLE md_import_batch
	ALTER COLUMN payload_hash SET NOT NULL,
	ALTER COLUMN operation_type SET NOT NULL,
	ALTER COLUMN status SET DEFAULT 'claimed';--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS md_import_batch_org_id_uidx
	ON md_import_batch (organization_id, id);--> statement-breakpoint

ALTER TABLE md_import_batch
	ADD CONSTRAINT md_import_batch_status_ck
	CHECK (status IN (
		'claimed',
		'validating',
		'approval_pending',
		'approved',
		'applying',
		'partially_applied',
		'applied',
		'failed',
		'cancelled'
	));--> statement-breakpoint

ALTER TABLE md_import_batch
	ADD CONSTRAINT md_import_batch_lease_ck
	CHECK (
		(lease_owner IS NULL AND lease_expires_at IS NULL)
		OR (lease_owner IS NOT NULL AND lease_expires_at IS NOT NULL)
	);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS md_import_batch_row (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	organization_id text NOT NULL,
	batch_id uuid NOT NULL,
	source_row_number integer NOT NULL,
	payload_hash text NOT NULL,
	normalized_payload jsonb NOT NULL,
	intended_operation text,
	matched_entity_id uuid,
	status text DEFAULT 'pending' NOT NULL,
	error_code text,
	error_details jsonb,
	result_entity_id uuid,
	result_version integer,
	attempt_count integer DEFAULT 0 NOT NULL,
	lease_owner text,
	lease_expires_at timestamp with time zone,
	started_at timestamp with time zone,
	completed_at timestamp with time zone,
	created_at timestamp with time zone DEFAULT now() NOT NULL,
	updated_at timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT md_import_batch_row_org_batch_fk
		FOREIGN KEY (organization_id, batch_id)
		REFERENCES md_import_batch (organization_id, id),
	CONSTRAINT md_import_batch_row_source_number_ck CHECK (source_row_number > 0),
	CONSTRAINT md_import_batch_row_status_ck
		CHECK (status IN ('pending', 'applying', 'applied', 'failed', 'skipped')),
	CONSTRAINT md_import_batch_row_operation_ck
		CHECK (intended_operation IS NULL OR intended_operation IN ('create', 'update', 'skip', 'reject')),
	CONSTRAINT md_import_batch_row_lease_ck CHECK (
		(lease_owner IS NULL AND lease_expires_at IS NULL)
		OR (lease_owner IS NOT NULL AND lease_expires_at IS NOT NULL)
	)
);--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS md_import_batch_row_org_source_uidx
	ON md_import_batch_row (organization_id, batch_id, source_row_number);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS md_import_batch_row_org_status_idx
	ON md_import_batch_row (organization_id, batch_id, status, source_row_number);
