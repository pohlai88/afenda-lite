DO $$
BEGIN
	IF EXISTS (SELECT 1 FROM payment) THEN
		RAISE EXCEPTION 'Canonical payments cutover requires an empty payment table';
	END IF;
END $$;
--> statement-breakpoint
CREATE TABLE "payment_method" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"code" text NOT NULL,
	"normalized_code" text NOT NULL,
	"name" text NOT NULL,
	"kind" text NOT NULL,
	"instrument_requirement" text NOT NULL,
	"allowed_instrument_kinds" text NOT NULL,
	"allowed_account_kinds" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "payment_method_org_id_idx" ON "payment_method" ("organization_id","id");
--> statement-breakpoint
CREATE UNIQUE INDEX "payment_method_org_normalized_code_uidx" ON "payment_method" ("organization_id","normalized_code");
--> statement-breakpoint
ALTER TABLE "payment"
	ADD COLUMN "payment_method_id" uuid NOT NULL,
	ADD COLUMN "method_snapshot" text,
	ADD COLUMN "instrument" text,
	ADD COLUMN "clearance_status" text DEFAULT 'not-applicable' NOT NULL,
	ADD COLUMN "clearance_idempotency_key" text,
	ADD COLUMN "fx_context" text,
	ADD COLUMN "functional_amount" text NOT NULL;
--> statement-breakpoint
ALTER TABLE "payment" ADD CONSTRAINT "payment_payment_method_id_payment_method_id_fk" FOREIGN KEY ("payment_method_id") REFERENCES "public"."payment_method"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE TABLE "payment_deduction" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"payment_id" uuid NOT NULL,
	"line_no" integer NOT NULL,
	"kind" text NOT NULL,
	"effect" text NOT NULL,
	"amount" text NOT NULL,
	"functional_amount" text,
	"accounting_purpose_code" text NOT NULL,
	"description" text,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "payment_deduction" ADD CONSTRAINT "payment_deduction_payment_id_payment_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payment"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "payment_deduction_org_payment_idx" ON "payment_deduction" ("organization_id","payment_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "payment_deduction_payment_line_uidx" ON "payment_deduction" ("payment_id","line_no");
