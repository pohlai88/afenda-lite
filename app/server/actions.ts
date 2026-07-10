/**
 * AdminCN demo server actions — static fake-db reads for platform-views.
 * Swap for real portal queries when product screens replace demo UI.
 */
'use server'

import { db as calendarDb } from '@/components-V2/platform-fake-db/apps/calendar'
import { initialColumns, teamMembers } from '@/components-V2/platform-fake-db/apps/kanban'
import { db as mailDb } from '@/components-V2/platform-fake-db/apps/mail'
import { db as faqDb } from '@/components-V2/platform-fake-db/pages/faq'
import { db as pricingDb } from '@/components-V2/platform-fake-db/pages/pricing'
import { db as userSettingsDb } from '@/components-V2/platform-fake-db/pages/user-settings'
import { db as userProfileDb } from '@/components-V2/platform-fake-db/pages/user-profile'

export const getCalendarData = async () => calendarDb

export const getKanbanData = async () => ({
  columns: initialColumns,
  teamMembers,
})

export const getMailData = async () => mailDb

export const getMembersData = async () => ({
  members: userSettingsDb.members,
  pending: userSettingsDb.pending,
})

export const getSessionsData = async () => userSettingsDb.sessions

export const getIntegrationsData = async () => userSettingsDb.integrations

export const getProfileData = async () => userProfileDb

export const getPricingData = async () => pricingDb

export const getFaqData = async () => faqDb
