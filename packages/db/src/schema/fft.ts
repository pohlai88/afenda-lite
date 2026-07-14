/**
 * FFT Living tenant roots (ARCH-023):
 * fft_event, fft_sales_member, fft_role, fft_role_assignment.
 *
 * Child FFT tables (D4/M5) stay out of this skeleton until requested.
 * Reconciled from `br-tiny-hill-ao82jp6f` — `organization_id` is text NOT NULL.
 */
import {
  boolean,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const fftEvent = pgTable("fft_event", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventCode: text("event_code").notNull(),
  eventName: text("event_name").notNull(),
  eventType: text("event_type").notNull().default("hot_sales"),
  descriptionEn: text("description_en"),
  descriptionVi: text("description_vi"),
  opensAt: timestamp("opens_at", { withTimezone: true }).notNull(),
  closesAt: timestamp("closes_at", { withTimezone: true }).notNull(),
  timezone: text("timezone").notNull().default("Asia/Ho_Chi_Minh"),
  status: text("status").notNull().default("draft"),
  sourceLocation: text("source_location"),
  allocationMethod: text("allocation_method").notNull().default("priority_fcfs"),
  standaloneProgram: boolean("standalone_program").notNull().default(true),
  combinationAllowed: boolean("combination_allowed").notNull().default(false),
  transferAllowed: boolean("transfer_allowed").notNull().default(true),
  depositRequired: boolean("deposit_required").notNull().default(false),
  depositRefundable: boolean("deposit_refundable").notNull().default(false),
  supportType: text("support_type").notNull().default("fixed_per_unit"),
  supportAmountPerUnit: numeric("support_amount_per_unit"),
  supportUnitLabel: text("support_unit_label"),
  isTemplate: boolean("is_template").notNull().default(false),
  clonedFromId: uuid("cloned_from_id"),
  createdBy: uuid("created_by").notNull(),
  updatedBy: uuid("updated_by"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  organizationId: text("organization_id").notNull(),
});

export const fftSalesMember = pgTable("fft_sales_member", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id"),
  email: text("email").notNull().unique(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  organizationId: text("organization_id").notNull(),
});

export const fftRole = pgTable("fft_role", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  active: boolean("active").notNull().default(true),
  isSystemTemplate: boolean("is_system_template").notNull().default(false),
  templateKey: text("template_key").unique(),
  createdBy: uuid("created_by"),
  updatedBy: uuid("updated_by"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  organizationId: text("organization_id").notNull(),
});

export const fftRoleAssignment = pgTable("fft_role_assignment", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  userEmail: text("user_email"),
  roleId: uuid("role_id").notNull(),
  scopeType: text("scope_type").notNull(),
  scopeId: text("scope_id"),
  active: boolean("active").notNull().default(true),
  createdBy: uuid("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  organizationId: text("organization_id").notNull(),
});
