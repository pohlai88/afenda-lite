ALTER TABLE "hr_job_requisition" ADD COLUMN "hiring_manager_employee_id" uuid;--> statement-breakpoint
ALTER TABLE "hr_job_requisition" ADD CONSTRAINT "hr_job_requisition_hiring_manager_employee_id_hr_employee_id_fk" FOREIGN KEY ("hiring_manager_employee_id") REFERENCES "public"."hr_employee"("id") ON DELETE no action ON UPDATE no action;
