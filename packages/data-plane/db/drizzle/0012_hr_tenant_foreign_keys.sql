-- HR-ENT-04-AUTH-PRIVACY
-- Upgrade every single-column HR foreign key whose parent is tenant-owned to
-- a composite (organization_id, reference) foreign key. This is intentionally
-- catalog-driven so the control covers the complete 106-table HR surface and
-- fails closed for future HR references included in the migration baseline.
DO $$
DECLARE
	reference RECORD;
	parent_unique_index_name text;
	tenant_constraint_name text;
BEGIN
	FOR reference IN
		SELECT
			constraint_row.conrelid,
			constraint_row.confrelid,
			constraint_row.conname,
			child_table.relname AS child_table,
			parent_table.relname AS parent_table,
			child_column.attname AS child_column,
			parent_column.attname AS parent_column
		FROM pg_constraint AS constraint_row
		JOIN pg_class AS child_table
			ON child_table.oid = constraint_row.conrelid
		JOIN pg_namespace AS child_namespace
			ON child_namespace.oid = child_table.relnamespace
		JOIN pg_class AS parent_table
			ON parent_table.oid = constraint_row.confrelid
		JOIN pg_namespace AS parent_namespace
			ON parent_namespace.oid = parent_table.relnamespace
		JOIN pg_attribute AS child_column
			ON child_column.attrelid = constraint_row.conrelid
			AND child_column.attnum = constraint_row.conkey[1]
		JOIN pg_attribute AS parent_column
			ON parent_column.attrelid = constraint_row.confrelid
			AND parent_column.attnum = constraint_row.confkey[1]
		WHERE constraint_row.contype = 'f'
			AND cardinality(constraint_row.conkey) = 1
			AND child_namespace.nspname = 'public'
			AND parent_namespace.nspname = 'public'
			AND child_table.relname LIKE 'hr\_%' ESCAPE '\'
			AND child_column.attname <> 'organization_id'
			AND EXISTS (
				SELECT 1
				FROM pg_attribute AS child_org
				WHERE child_org.attrelid = constraint_row.conrelid
					AND child_org.attname = 'organization_id'
					AND child_org.attnum > 0
					AND NOT child_org.attisdropped
			)
			AND EXISTS (
				SELECT 1
				FROM pg_attribute AS parent_org
				WHERE parent_org.attrelid = constraint_row.confrelid
					AND parent_org.attname = 'organization_id'
					AND parent_org.attnum > 0
					AND NOT parent_org.attisdropped
			)
		ORDER BY child_table.relname, constraint_row.conname
	LOOP
		parent_unique_index_name := left(
			reference.parent_table || '_org_' || reference.parent_column || '_tenant_uidx',
			63
		);
		tenant_constraint_name := left(reference.conname, 53) || '_tenant_fk';

		EXECUTE format(
			'CREATE UNIQUE INDEX IF NOT EXISTS %I ON %I (organization_id, %I)',
			parent_unique_index_name,
			reference.parent_table,
			reference.parent_column
		);
		EXECUTE format(
			'ALTER TABLE %I DROP CONSTRAINT %I',
			reference.child_table,
			reference.conname
		);
		EXECUTE format(
			'ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY (organization_id, %I) REFERENCES %I (organization_id, %I) NOT VALID',
			reference.child_table,
			tenant_constraint_name,
			reference.child_column,
			reference.parent_table,
			reference.parent_column
		);
		EXECUTE format(
			'ALTER TABLE %I VALIDATE CONSTRAINT %I',
			reference.child_table,
			tenant_constraint_name
		);
	END LOOP;
END $$;
