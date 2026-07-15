/**
 * Seed data loaders for AdminCN kit views (Studio server-actions DNA).
 * Not Next `'use server'` — apps/web may wrap these later.
 */

import { db as calendarDb } from "./apps/calendar";
import { initialColumns, teamMembers } from "./apps/kanban";
import { db as mailDb } from "./apps/mail";
import { db as faqDb } from "./pages/faq";
import { db as pricingDb } from "./pages/pricing";
import { db as userProfileDb } from "./pages/user-profile";
import { db as userSettingsDb } from "./pages/user-settings";

export const getCalendarData = async () => calendarDb;

export const getKanbanData = async () => ({
	columns: initialColumns,
	teamMembers,
});

export const getMailData = async () => mailDb;

export const getMembersData = async () => ({
	members: userSettingsDb.members,
	pending: userSettingsDb.pending,
});

export const getSessionsData = async () => userSettingsDb.sessions;

export const getIntegrationsData = async () => userSettingsDb.integrations;

export const getProfileData = async () => userProfileDb;

export const getPricingData = async () => pricingDb;

export const getFaqData = async () => faqDb;
