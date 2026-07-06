"use server";

import { revalidatePath } from "next/cache";
import { requireAdminSession } from "@/app/actions/admin";
import { getAppBaseUrl } from "@/lib/app-url";
import {
  getOrCreateInviteToken,
  getSurveyForAdmin,
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
