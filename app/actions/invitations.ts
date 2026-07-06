"use server";

import { revalidatePath } from "next/cache";
import { requireAdminSession } from "@/app/actions/admin";
import { getAppBaseUrl } from "@/lib/app-url";
import { buildAnonymousEmailMessage } from "@/lib/invite";
import { portalCopy } from "@/lib/portal-copy";
import {
  getOrCreateInviteToken,
  getSurveyForAdmin,
  recordSurveyInvitation,
  regenerateInviteToken,
} from "@/lib/surveys";

async function buildInviteLink(surveyId: string, token: string) {
  const survey = await getSurveyForAdmin(surveyId);
  if (!survey) {
    return null;
  }

  return {
    token,
    url: `${getAppBaseUrl()}/f/${token}`,
    surveyId: survey.id,
  };
}

export async function getAnonymousInviteLinkAction(surveyId: string) {
  const session = await requireAdminSession();
  const survey = await getSurveyForAdmin(surveyId);

  if (!survey) {
    return { error: "Survey not found." };
  }

  const token = await getOrCreateInviteToken({
    surveyId: survey.id,
    createdBy: session.user.id,
  });

  const link = await buildInviteLink(survey.id, token);
  if (!link) {
    return { error: "Survey not found." };
  }

  return { success: true, ...link };
}

export async function regenerateAnonymousInviteLinkAction(surveyId: string) {
  const session = await requireAdminSession();
  const survey = await getSurveyForAdmin(surveyId);

  if (!survey) {
    return { error: "Survey not found." };
  }

  const token = await regenerateInviteToken({
    surveyId: survey.id,
    createdBy: session.user.id,
  });

  const link = await buildInviteLink(survey.id, token);
  if (!link) {
    return { error: "Survey not found." };
  }

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/${survey.id}`);

  return { success: true, ...link };
}

export async function recordEmailInvitationAction(formData: FormData) {
  const session = await requireAdminSession();
  const surveyId = String(formData.get("surveyId") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!surveyId || !email.includes("@")) {
    return { error: portalCopy.invite.recordError };
  }

  const survey = await getSurveyForAdmin(surveyId);
  if (!survey) {
    return { error: "Declaration not found." };
  }

  const token = await getOrCreateInviteToken({
    surveyId: survey.id,
    createdBy: session.user.id,
  });
  const url = `${getAppBaseUrl()}/f/${token}`;

  await recordSurveyInvitation({
    surveyId: survey.id,
    clientEmail: email,
    invitedBy: session.user.id,
  });

  revalidatePath(`/dashboard/${survey.id}`);

  const { combined } = buildAnonymousEmailMessage(url);
  return { success: true, combined, url };
}
