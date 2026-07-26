-- Corporate Administration module wipe — greenfield rebuild pending.
-- Drops every public ca_* table (CASCADE handles FK order).

DO $$
DECLARE
	table_name text;
BEGIN
	FOR table_name IN
		SELECT tablename
		FROM pg_tables
		WHERE schemaname = 'public'
			AND tablename LIKE 'ca\_%' ESCAPE '\'
	LOOP
		EXECUTE format('DROP TABLE IF EXISTS %I CASCADE', table_name);
	END LOOP;
END $$;
