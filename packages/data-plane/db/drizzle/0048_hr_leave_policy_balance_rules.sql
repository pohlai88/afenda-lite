ALTER TABLE "hr_leave_policy" ADD COLUMN "accrual_basis" text DEFAULT 'none' NOT NULL;
--> statement-breakpoint
ALTER TABLE "hr_leave_policy" ADD COLUMN "accrual_frequency" text;
--> statement-breakpoint
ALTER TABLE "hr_leave_policy" ADD COLUMN "accrual_quantity_per_period" text;
--> statement-breakpoint
ALTER TABLE "hr_leave_policy" ADD COLUMN "carry_forward_enabled" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "hr_leave_policy" ADD COLUMN "carry_forward_max_quantity" text;
--> statement-breakpoint
ALTER TABLE "hr_leave_policy" ADD COLUMN "entitlement_expiry_rule" text DEFAULT 'none' NOT NULL;
--> statement-breakpoint
ALTER TABLE "hr_leave_policy" ADD COLUMN "entitlement_expiry_days" integer;
--> statement-breakpoint
ALTER TABLE "hr_leave_policy" ADD CONSTRAINT "hr_leave_policy_accrual_basis_check" CHECK ("accrual_basis" IN ('none', 'periodic', 'anniversary'));
--> statement-breakpoint
ALTER TABLE "hr_leave_policy" ADD CONSTRAINT "hr_leave_policy_accrual_frequency_check" CHECK ("accrual_frequency" IS NULL OR "accrual_frequency" IN ('monthly', 'annual'));
--> statement-breakpoint
ALTER TABLE "hr_leave_policy" ADD CONSTRAINT "hr_leave_policy_entitlement_expiry_rule_check" CHECK ("entitlement_expiry_rule" IN ('none', 'period_end', 'days_after_period_end'));
--> statement-breakpoint
ALTER TABLE "hr_leave_policy" ADD CONSTRAINT "hr_leave_policy_accrual_config_check" CHECK (("accrual_basis" = 'none' AND "accrual_frequency" IS NULL AND "accrual_quantity_per_period" IS NULL) OR ("accrual_basis" <> 'none' AND "accrual_frequency" IS NOT NULL AND "accrual_quantity_per_period" IS NOT NULL));
--> statement-breakpoint
ALTER TABLE "hr_leave_policy" ADD CONSTRAINT "hr_leave_policy_carry_forward_check" CHECK (("carry_forward_enabled" = false AND "carry_forward_max_quantity" IS NULL) OR ("carry_forward_enabled" = true));
--> statement-breakpoint
ALTER TABLE "hr_leave_policy" ADD CONSTRAINT "hr_leave_policy_entitlement_expiry_days_check" CHECK (("entitlement_expiry_rule" = 'days_after_period_end' AND "entitlement_expiry_days" IS NOT NULL) OR ("entitlement_expiry_rule" <> 'days_after_period_end' AND "entitlement_expiry_days" IS NULL));
