ALTER TABLE "md_warehouse"
	ADD COLUMN IF NOT EXISTS "address_country_id" uuid,
	ADD COLUMN IF NOT EXISTS "address_line1" text,
	ADD COLUMN IF NOT EXISTS "address_line2" text,
	ADD COLUMN IF NOT EXISTS "address_city" text,
	ADD COLUMN IF NOT EXISTS "address_region" text,
	ADD COLUMN IF NOT EXISTS "address_postal_code" text;

DO $$ BEGIN
	ALTER TABLE "md_warehouse"
		ADD CONSTRAINT "md_warehouse_address_country_fk"
		FOREIGN KEY ("address_country_id") REFERENCES "ref_country"("id");
EXCEPTION
	WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "md_warehouse_address_country_idx"
	ON "md_warehouse" ("address_country_id");

ALTER TABLE "md_payment_term"
	ADD COLUMN IF NOT EXISTS "discount_days" integer,
	ADD COLUMN IF NOT EXISTS "discount_percent" numeric(7, 4),
	ADD COLUMN IF NOT EXISTS "due_day_rule" text NOT NULL DEFAULT 'net_days',
	ADD COLUMN IF NOT EXISTS "end_of_month" boolean NOT NULL DEFAULT false,
	ADD COLUMN IF NOT EXISTS "installment_policy" text NOT NULL DEFAULT 'none',
	ADD COLUMN IF NOT EXISTS "installment_count" integer,
	ADD COLUMN IF NOT EXISTS "valid_from" timestamp with time zone,
	ADD COLUMN IF NOT EXISTS "valid_to" timestamp with time zone,
	ADD COLUMN IF NOT EXISTS "currency_restriction_id" uuid;

DO $$ BEGIN
	ALTER TABLE "md_payment_term"
		ADD CONSTRAINT "md_payment_term_currency_restriction_fk"
		FOREIGN KEY ("currency_restriction_id") REFERENCES "ref_currency"("id");
EXCEPTION
	WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "md_payment_term_currency_restriction_idx"
	ON "md_payment_term" ("currency_restriction_id");

DO $$ BEGIN
	ALTER TABLE "md_payment_term"
		ADD CONSTRAINT "md_payment_term_net_days_ck"
		CHECK ("net_days" BETWEEN 0 AND 999);
EXCEPTION
	WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
	ALTER TABLE "md_payment_term"
		ADD CONSTRAINT "md_payment_term_discount_days_ck"
		CHECK ("discount_days" IS NULL OR ("discount_days" >= 0 AND "discount_days" <= "net_days"));
EXCEPTION
	WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
	ALTER TABLE "md_payment_term"
		ADD CONSTRAINT "md_payment_term_discount_percent_ck"
		CHECK ("discount_percent" IS NULL OR ("discount_percent" > 0 AND "discount_percent" <= 100));
EXCEPTION
	WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
	ALTER TABLE "md_payment_term"
		ADD CONSTRAINT "md_payment_term_discount_pair_ck"
		CHECK ("discount_percent" IS NULL OR "discount_days" IS NOT NULL);
EXCEPTION
	WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
	ALTER TABLE "md_payment_term"
		ADD CONSTRAINT "md_payment_term_due_day_rule_ck"
		CHECK ("due_day_rule" IN ('net_days', 'end_of_month', 'day_of_month'));
EXCEPTION
	WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
	ALTER TABLE "md_payment_term"
		ADD CONSTRAINT "md_payment_term_installment_policy_ck"
		CHECK ("installment_policy" IN ('none', 'equal_installments'));
EXCEPTION
	WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
	ALTER TABLE "md_payment_term"
		ADD CONSTRAINT "md_payment_term_installment_count_ck"
		CHECK (("installment_policy" = 'none' AND "installment_count" IS NULL) OR ("installment_policy" = 'equal_installments' AND "installment_count" >= 2));
EXCEPTION
	WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
	ALTER TABLE "md_payment_term"
		ADD CONSTRAINT "md_payment_term_validity_range_ck"
		CHECK ("valid_to" IS NULL OR "valid_from" IS NULL OR "valid_to" >= "valid_from");
EXCEPTION
	WHEN duplicate_object THEN NULL;
END $$;
