"use server";

import { revalidatePath } from "next/cache";
import { requireAdminSession } from "@/app/actions/admin";
import { getAppBaseUrl, sendSurveyInvitation } from "@/lib/email";
import {
  getSurveyForAdmin,
  recordSurveyInvitation,
} from "@/lib/surveys";

export async function sendSurveyInviteAction(formData: FormData) {
  const session = await requireAdminSession();
  const surveyId = String(formData.get("surveyId") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!surveyId || !email) {
    return { error: "Survey and client email are required." };
  }

  const survey = await getSurveyForAdmin(surveyId);
  if (!survey) {
    return { error: "Survey not found." };
  }

  const surveyUrl = `${getAppBaseUrl()}/survey/${survey.slug}`;

  try {
    await sendSurveyInvitation({
      to: email,
      surveyTitle: survey.title,
      surveyUrl,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to send invitation.";
    return { error: message };
  }

  await recordSurveyInvitation({
    surveyId: survey.id,
    clientEmail: email,
    invitedBy: session.user.id,
  });

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/${survey.id}`);

  return { success: true };
}
