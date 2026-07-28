ALTER TABLE ca_legal_company
	DROP CONSTRAINT IF EXISTS ca_legal_company_state_check;--> statement-breakpoint

ALTER TABLE ca_legal_company
	ADD CONSTRAINT ca_legal_company_state_check
	CHECK (state IN (
		'draft',
		'active',
		'suspended',
		'struck_off',
		'in_liquidation',
		'dissolved',
		'restored',
		'archived'
	));--> statement-breakpoint

CREATE TABLE IF NOT EXISTS ca_company_status_history (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	organization_id text NOT NULL,
	legal_company_id uuid NOT NULL,
	status text NOT NULL,
	effective_from date NOT NULL,
	effective_to date,
	recorded_at timestamp with time zone NOT NULL,
	recorded_by text NOT NULL,
	reason text,
	source_document_id text NOT NULL,
	version integer DEFAULT 1 NOT NULL,
	created_at timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT ca_company_status_value_check CHECK (status IN (
		'draft',
		'active',
		'suspended',
		'struck_off',
		'in_liquidation',
		'dissolved',
		'restored',
		'archived'
	)),
	CONSTRAINT ca_company_status_effective_range_check CHECK (
		effective_to IS NULL OR effective_from < effective_to
	),
	CONSTRAINT ca_company_status_source_check CHECK (
		char_length(btrim(source_document_id)) > 0
	),
	CONSTRAINT ca_company_status_reason_check CHECK (
		reason IS NULL OR char_length(btrim(reason)) > 0
	),
	CONSTRAINT ca_company_status_version_check CHECK (version > 0)
);--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS ca_company_status_version_uidx
	ON ca_company_status_history (organization_id, legal_company_id, version);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS ca_company_status_as_of_idx
	ON ca_company_status_history (
		organization_id,
		legal_company_id,
		effective_from,
		effective_to,
		recorded_at
	);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS ca_company_status_value_idx
	ON ca_company_status_history (
		organization_id,
		status,
		effective_from,
		effective_to
	);
