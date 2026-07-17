/**
 * Platform IAM tables (public). Neon Auth `organization` / `user` / `member`
 * live in `neon_auth` and are not duplicated here (ARCH-023 · ARCH-026).
 *
 * Column types reconciled from live branch `br-tiny-hill-ao82jp6f` (2026-07-14).
 * `organization_id` is `text` (Neon Auth org ids), not uuid.
 */
import { sql } from "drizzle-orm";
import {
	boolean,
	jsonb,
	pgTable,
	primaryKey,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";

export const platformPermission = pgTable("platform_permission", {
	code: text("code").primaryKey(),
	module: text("module").notNull(),
	description: text("description").notNull(),
	sensitive: boolean("sensitive").notNull().default(false),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

export const platformRole = pgTable("platform_role", {
	id: uuid("id").primaryKey().defaultRandom(),
	/** NULL only when `isSystemTemplate` is true (ARCH-023). */
	organizationId: text("organization_id"),
	name: text("name").notNull(),
	description: text("description"),
	active: boolean("active").notNull().default(true),
	isSystemTemplate: boolean("is_system_template").notNull().default(false),
	templateKey: text("template_key"),
	createdBy: text("created_by"),
	updatedBy: text("updated_by"),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

export const platformRoleAssignment = pgTable(
	"platform_role_assignment",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		userId: text("user_id").notNull(),
		organizationId: text("organization_id").notNull(),
		roleId: uuid("role_id").notNull(),
		scopeType: text("scope_type").notNull(),
		scopeId: text("scope_id"),
		active: boolean("active").notNull().default(true),
		grantedBy: text("granted_by"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		/** N12 Path-to-100%: one active assignment per natural key (soft-revoke OK). */
		uniqueIndex("platform_role_assignment_active_natural_key_uidx")
			.on(t.userId, t.organizationId, t.roleId, t.scopeType, t.scopeId)
			.where(sql`${t.active} = true`),
	],
);

export const platformRolePermission = pgTable(
	"platform_role_permission",
	{
		roleId: uuid("role_id").notNull(),
		permissionCode: text("permission_code").notNull(),
		grantedAt: timestamp("granted_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		grantedBy: text("granted_by"),
	},
	(t) => [primaryKey({ columns: [t.roleId, t.permissionCode] })],
);

export const platformRbacAudit = pgTable("platform_rbac_audit", {
	id: uuid("id").primaryKey().defaultRandom(),
	action: text("action").notNull(),
	/** Required — writer stamps session user (ARCH-023 · GUIDE-017 · N12). */
	actorUserId: text("actor_user_id").notNull(),
	/** Required — writer stamps session org; hard tenancy predicate (ARCH-023 · N12). */
	organizationId: text("organization_id").notNull(),
	targetType: text("target_type"),
	targetId: text("target_id"),
	roleId: uuid("role_id"),
	permissionCode: text("permission_code"),
	oldValue: jsonb("old_value"),
	newValue: jsonb("new_value"),
	reason: text("reason"),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});
