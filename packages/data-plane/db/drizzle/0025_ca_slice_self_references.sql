ALTER TABLE "ca_share_transaction" ADD CONSTRAINT "ca_share_transaction_reversal_of_id_ca_share_transaction_id_fk" FOREIGN KEY ("reversal_of_id") REFERENCES "public"."ca_share_transaction"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ca_corporate_document" ADD CONSTRAINT "ca_corporate_document_supersedes_id_ca_corporate_document_id_fk" FOREIGN KEY ("supersedes_id") REFERENCES "public"."ca_corporate_document"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ca_resolution" ADD CONSTRAINT "ca_resolution_superseded_by_id_ca_resolution_id_fk" FOREIGN KEY ("superseded_by_id") REFERENCES "public"."ca_resolution"("id") ON DELETE no action ON UPDATE no action;
