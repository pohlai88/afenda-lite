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
	check,
	customType,
	date,
	foreignKey,
	index,
	integer,
	jsonb,
	pgTable,
	primaryKey,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";

/** Postgres `tsvector` — maintained on write via `to_tsvector`. */
const tsvector = customType<{ data: string }>({
	dataType() {
		return "tsvector";
	},
});

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
		index("platform_role_assignment_org_active_user_idx").on(
			t.organizationId,
			t.active,
			t.userId,
		),
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

export const platformRbacAudit = pgTable(
	"platform_rbac_audit",
	{
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
		/** API-007 / GUIDE-018 I5.3 — required on new privileged writes; null on history. */
		correlationId: text("correlation_id"),
		/** Optional request attribution (nullable on history / non-HTTP writers). */
		ipAddress: text("ip_address"),
		userAgent: text("user_agent"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		index("platform_rbac_audit_org_created_id_idx").on(
			t.organizationId,
			t.createdAt,
			t.id,
		),
	],
);

/**
 * General domain activity audit (distinct from RBAC `platform_rbac_audit`).
 * Sole writer: `@afenda/audit` — do not dual-write from apps/web.
 */
export const platformAuditLog = pgTable(
	"platform_audit_log",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		/** Required — hard tenancy predicate (ARCH-023). */
		organizationId: text("organization_id").notNull(),
		/** Required — writer stamps session user. */
		actorUserId: text("actor_user_id").notNull(),
		/** API-007 — required on new writes. */
		correlationId: text("correlation_id").notNull(),
		module: text("module").notNull(),
		entity: text("entity").notNull(),
		entityId: text("entity_id").notNull(),
		action: text("action").notNull(),
		changes: jsonb("changes").notNull(),
		oldValue: jsonb("old_value"),
		newValue: jsonb("new_value"),
		metadata: jsonb("metadata"),
		ipAddress: text("ip_address"),
		userAgent: text("user_agent"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		index("platform_audit_log_org_created_at_idx").on(
			t.organizationId,
			t.createdAt,
		),
		index("platform_audit_log_org_entity_idx").on(
			t.organizationId,
			t.entity,
			t.entityId,
		),
		index("platform_audit_log_org_actor_idx").on(
			t.organizationId,
			t.actorUserId,
		),
		index("platform_audit_log_org_action_idx").on(t.organizationId, t.action),
		index("platform_audit_log_org_module_idx").on(t.organizationId, t.module),
	],
);

/**
 * Org-scoped product search documents (Postgres FTS).
 * Sole writer: `@afenda/search` — do not dual-write from apps/web.
 */
export const platformSearchDocument = pgTable(
	"platform_search_document",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		/** Required — hard tenancy predicate (ARCH-023). */
		organizationId: text("organization_id").notNull(),
		/** Caller-defined entity type key (e.g. `member`). */
		entity: text("entity").notNull(),
		/** Source id within entity. */
		documentId: text("document_id").notNull(),
		title: text("title").notNull(),
		description: text("description"),
		url: text("url"),
		metadata: jsonb("metadata"),
		searchVector: tsvector("search_vector").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		uniqueIndex("platform_search_document_org_entity_doc_uidx").on(
			t.organizationId,
			t.entity,
			t.documentId,
		),
		index("platform_search_document_org_entity_idx").on(
			t.organizationId,
			t.entity,
		),
		index("platform_search_document_search_vector_gin_idx").using(
			"gin",
			t.searchVector,
		),
	],
);

/**
 * Org-scoped in-app notifications (IN_APP channel).
 * Sole writer: `@afenda/notifications` — do not dual-write from apps/web.
 */
export const platformNotification = pgTable(
	"platform_notification",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		/** Required — hard tenancy predicate (ARCH-023). */
		organizationId: text("organization_id").notNull(),
		/** Recipient user (Neon Auth user id). */
		userId: text("user_id").notNull(),
		type: text("type").notNull(),
		priority: text("priority").notNull(),
		/** Slice-1 channel is always IN_APP (Zod-enforced at package boundary). */
		channel: text("channel").notNull(),
		title: text("title").notNull(),
		body: text("body").notNull(),
		module: text("module").notNull(),
		/** Optional handler idempotency key, scoped to org + user + module. */
		deduplicationKey: text("deduplication_key"),
		actionUrl: text("action_url"),
		metadata: jsonb("metadata"),
		read: boolean("read").notNull().default(false),
		expiresAt: timestamp("expires_at", { withTimezone: true }),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		index("platform_notification_org_user_created_at_idx").on(
			t.organizationId,
			t.userId,
			t.createdAt,
		),
		index("platform_notification_org_user_unread_idx").on(
			t.organizationId,
			t.userId,
			t.read,
		),
		uniqueIndex("platform_notification_org_user_module_dedupe_uidx")
			.on(t.organizationId, t.userId, t.module, t.deduplicationKey)
			.where(sql`${t.deduplicationKey} IS NOT NULL`),
	],
);

/**
 * Org-scoped domain-event outbox (pending → processed / failed).
 * Publication lifecycle owner: `@afenda/events`. Governed domain adapters may
 * append pending rows through transaction-scoped outbox ports; apps/web does
 * not write this table directly.
 */
export const platformDomainEvent = pgTable(
	"platform_domain_event",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		/** Required — hard tenancy predicate (ARCH-023). */
		organizationId: text("organization_id").notNull(),
		/** Dotted type — e.g. identity.org_role.assigned */
		type: text("type").notNull(),
		/** Living module source — platform | identity */
		sourceModule: text("source_module").notNull(),
		/** Replay-safe producer key, scoped to org + source + event type. */
		deduplicationKey: text("deduplication_key"),
		correlationId: text("correlation_id").notNull(),
		causationId: text("causation_id"),
		actorUserId: text("actor_user_id").notNull(),
		payload: jsonb("payload").notNull(),
		metadata: jsonb("metadata"),
		/** Outbox status — pending | processed | failed */
		status: text("status").notNull().default("pending"),
		attempts: integer("attempts").notNull().default(0),
		lastError: text("last_error"),
		processedAt: timestamp("processed_at", { withTimezone: true }),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		index("platform_domain_event_org_created_at_idx").on(
			t.organizationId,
			t.createdAt,
		),
		index("platform_domain_event_status_created_at_idx").on(
			t.status,
			t.createdAt,
		),
		index("platform_domain_event_org_type_idx").on(t.organizationId, t.type),
		uniqueIndex("platform_domain_event_org_source_type_dedupe_uidx")
			.on(t.organizationId, t.sourceModule, t.type, t.deduplicationKey)
			.where(sql`${t.deduplicationKey} IS NOT NULL`),
	],
);

/** Platform-owned approvals, tasks, reminders, and escalations. */
export const platformWorkItem = pgTable(
	"platform_work_item",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		kind: text("kind").notNull(),
		status: text("status").notNull().default("pending"),
		targetUserId: text("target_user_id").notNull(),
		entityType: text("entity_type").notNull(),
		entityId: text("entity_id").notNull(),
		title: text("title").notNull(),
		priority: text("priority").notNull(),
		dueOn: date("due_on", { mode: "string" }),
		sourceEventId: text("source_event_id").notNull(),
		deduplicationKey: text("deduplication_key").notNull(),
		factVersion: integer("fact_version").notNull(),
		version: integer("version").notNull().default(1),
		correlationId: text("correlation_id").notNull(),
		createdBy: text("created_by").notNull(),
		updatedBy: text("updated_by").notNull(),
		completedAt: timestamp("completed_at", { withTimezone: true }),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		uniqueIndex("platform_work_item_org_dedupe_uidx").on(
			t.organizationId,
			t.deduplicationKey,
		),
		uniqueIndex("platform_work_item_org_id_uidx").on(t.organizationId, t.id),
		index("platform_work_item_org_target_status_idx").on(
			t.organizationId,
			t.targetUserId,
			t.status,
			t.createdAt,
		),
		check(
			"platform_work_item_kind_check",
			sql`${t.kind} IN ('approval', 'task', 'reminder', 'escalation')`,
		),
		check(
			"platform_work_item_status_check",
			sql`${t.status} IN ('pending', 'in_progress', 'completed', 'approved', 'rejected', 'dismissed', 'cancelled')`,
		),
		check(
			"platform_work_item_kind_status_check",
			sql`(${t.kind} = 'approval' AND ${t.status} IN ('pending', 'approved', 'rejected', 'cancelled')) OR (${t.kind} = 'task' AND ${t.status} IN ('pending', 'in_progress', 'completed', 'cancelled')) OR (${t.kind} = 'reminder' AND ${t.status} IN ('pending', 'completed', 'dismissed', 'cancelled')) OR (${t.kind} = 'escalation' AND ${t.status} IN ('pending', 'in_progress', 'completed', 'cancelled'))`,
		),
		check("platform_work_item_version_check", sql`${t.version} > 0`),
		check("platform_work_item_fact_version_check", sql`${t.factVersion} > 0`),
	],
);

/** Immutable audit evidence for every platform work-item state version. */
export const platformWorkItemActivity = pgTable(
	"platform_work_item_activity",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		organizationId: text("organization_id").notNull(),
		workItemId: uuid("work_item_id").notNull(),
		fromStatus: text("from_status"),
		toStatus: text("to_status").notNull(),
		resultingVersion: integer("resulting_version").notNull(),
		action: text("action").notNull(),
		actorUserId: text("actor_user_id").notNull(),
		correlationId: text("correlation_id").notNull(),
		reason: text("reason"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		uniqueIndex("platform_work_item_activity_org_item_version_uidx").on(
			t.organizationId,
			t.workItemId,
			t.resultingVersion,
		),
		index("platform_work_item_activity_org_created_idx").on(
			t.organizationId,
			t.createdAt,
		),
		foreignKey({
			columns: [t.organizationId, t.workItemId],
			foreignColumns: [platformWorkItem.organizationId, platformWorkItem.id],
			name: "platform_work_item_activity_org_item_fk",
		}),
		check(
			"platform_work_item_activity_status_check",
			sql`${t.toStatus} IN ('pending', 'in_progress', 'completed', 'approved', 'rejected', 'dismissed', 'cancelled') AND (${t.fromStatus} IS NULL OR ${t.fromStatus} IN ('pending', 'in_progress', 'completed', 'approved', 'rejected', 'dismissed', 'cancelled'))`,
		),
		check(
			"platform_work_item_activity_action_check",
			sql`${t.action} IN ('recorded', 'transitioned')`,
		),
		check(
			"platform_work_item_activity_version_check",
			sql`${t.resultingVersion} > 0`,
		),
	],
);
