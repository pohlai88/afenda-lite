CREATE TABLE "hr_user_employee" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"user_id" text NOT NULL,
	"employee_id" uuid NOT NULL,
	"relationship_type" text NOT NULL,
	"effective_from" date NOT NULL,
	"effective_until" date,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hr_user_employee_relationship_type_check" CHECK ("relationship_type" IN ('self', 'proxy')),
	CONSTRAINT "hr_user_employee_effective_dates_check" CHECK ("effective_until" IS NULL OR "effective_until" > "effective_from")
);
--> statement-breakpoint
ALTER TABLE "hr_user_employee" ADD CONSTRAINT "hr_user_employee_employee_id_hr_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."hr_employee"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "hr_user_employee_org_user_idx" ON "hr_user_employee" USING btree ("organization_id","user_id");
--> statement-breakpoint
CREATE INDEX "hr_user_employee_org_employee_idx" ON "hr_user_employee" USING btree ("organization_id","employee_id");
--> statement-breakpoint
CREATE INDEX "hr_user_employee_effective_idx" ON "hr_user_employee" USING btree ("organization_id","user_id","effective_from","effective_until");
--> statement-breakpoint
CREATE UNIQUE INDEX "hr_user_employee_org_user_emp_from_uidx" ON "hr_user_employee" USING btree ("organization_id","user_id","employee_id","effective_from");
