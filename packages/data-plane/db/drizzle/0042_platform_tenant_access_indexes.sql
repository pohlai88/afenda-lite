CREATE INDEX "platform_rbac_audit_org_created_id_idx"
	ON "platform_rbac_audit" USING btree ("organization_id", "created_at", "id");
--> statement-breakpoint
CREATE INDEX "platform_role_assignment_org_active_user_idx"
	ON "platform_role_assignment" USING btree ("organization_id", "active", "user_id");
