-- Payables: FK constraints for supplier_credit_note_line (0030 table).

DO $$ BEGIN
	ALTER TABLE "supplier_credit_note_line"
		ADD CONSTRAINT "supplier_credit_note_line_credit_note_id_supplier_credit_note_id_fk"
		FOREIGN KEY ("credit_note_id") REFERENCES "public"."supplier_credit_note"("id")
		ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "supplier_credit_note_line"
		ADD CONSTRAINT "supplier_credit_note_line_item_id_md_item_id_fk"
		FOREIGN KEY ("item_id") REFERENCES "public"."md_item"("id")
		ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
