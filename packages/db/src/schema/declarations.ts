/**
 * Declarations Living tenant roots (ARCH-023):
 * surveys, client_invitations, client_profiles, client_assignments.
 *
 * Reconciled from `br-tiny-hill-ao82jp6f` — `organization_id` is text NOT NULL.
 */
import {
	boolean,
	date,
	integer,
	jsonb,
	pgTable,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";

export const surveys = pgTable("surveys", {
	id: uuid("id").primaryKey().defaultRandom(),
	slug: text("slug").notNull().unique(),
	title: text("title").notNull(),
	question: text("question").notNull(),
	userId: uuid("user_id").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	referenceNumber: text("reference_number"),
	caseNumber: text("case_number"),
	effectiveDate: date("effective_date"),
	submitBefore: timestamp("submit_before", { withTimezone: true }),
	surveyorName: text("surveyor_name"),
	surveyorOrg: text("surveyor_org"),
	surveyeeIndividual: text("surveyee_individual"),
	surveyeeOrg: text("surveyee_org"),
	purpose: text("purpose"),
	categories: text("categories").array().notNull().default([]),
	organizationId: text("organization_id").notNull(),
});

export const clientInvitations = pgTable("client_invitations", {
	id: uuid("id").primaryKey().defaultRandom(),
	token: text("token").notNull().unique(),
	email: text("email").notNull(),
	fullName: text("full_name").notNull(),
	invitedBy: uuid("invited_by").notNull(),
	status: text("status").notNull().default("pending"),
	expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	entityName: text("entity_name"),
	jurisdiction: text("jurisdiction"),
	organizationId: text("organization_id").notNull(),
});

export const clientProfiles = pgTable("client_profiles", {
	userId: uuid("user_id").primaryKey(),
	phone: text("phone"),
	entityName: text("entity_name"),
	jurisdiction: text("jurisdiction"),
	notes: text("notes"),
	onboardingComplete: boolean("onboarding_complete").notNull().default(false),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	fullLegalName: text("full_legal_name"),
	nationality: text("nationality"),
	countryOfResidence: text("country_of_residence"),
	additionalResidenceCountries: text("additional_residence_countries")
		.array()
		.default([]),
	passportIssuingCountry: text("passport_issuing_country"),
	passportNumber: text("passport_number"),
	identityConsentAt: timestamp("identity_consent_at", { withTimezone: true }),
	portalAckAt: timestamp("portal_ack_at", { withTimezone: true }),
	portalAckVersion: text("portal_ack_version"),
	accountEmail: text("account_email"),
	organizationId: text("organization_id").notNull(),
});

export const clientAssignments = pgTable("client_assignments", {
	id: uuid("id").primaryKey().defaultRandom(),
	surveyId: uuid("survey_id").notNull(),
	clientEmail: text("client_email").notNull(),
	assignedBy: uuid("assigned_by").notNull(),
	status: text("status").notNull().default("pending"),
	dueDate: timestamp("due_date", { withTimezone: true }),
	confirmationCode: text("confirmation_code"),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	draftAnswers: jsonb("draft_answers"),
	draftStepIndex: integer("draft_step_index"),
	draftSavedAt: timestamp("draft_saved_at", { withTimezone: true }),
	organizationId: text("organization_id").notNull(),
});
