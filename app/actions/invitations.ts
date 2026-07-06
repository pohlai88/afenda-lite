"use server";

import { revalidatePath } from "next/cache";
import { requireAdminSession } from "@/app/actions/admin";
import { getAppBaseUrl } from "@/lib/app-url";
import { recordAuditEvent } from "@/lib/audit";
import { buildAnonymousEmailMessage } from "@/lib/invite";
import { runLoggedAction } from "@/lib/observability";
import { portalCopy } from "@/lib/portal-copy";
import { parseSchema } from "@/lib/schemas/common";
import {
  recordEmailInvitationSchema,
  surveyIdParamSchema,
} from "@/lib/schemas/invitations";
import {
  getOrCreateInviteToken,
  getSurveyForAdmin,
  recordSurveyInvitation,
  regenerateInviteToken,
} from "@/lib/surveys";

function inviteLinkFromToken(surveyId: string, token: string) {
  return {
    token,
    url: `${getAppBaseUrl()}/f/${token}`,
    surveyId,
  };
}

export async function getAnonymousInviteLinkAction(surveyId: string) {
  const session = await requireAdminSession();
  const parsed = parseSchema(surveyIdParamSchema, surveyId);

  if (!parsed.success) {
    return { error: portalCopy.errors.declarationNotFound };
  }

  const survey = await getSurveyForAdmin(parsed.data);

  if (!survey) {
    return { error: portalCopy.errors.declarationNotFound };
  }

  const token = await getOrCreateInviteToken({
    surveyId: survey.id,
    createdBy: session.user.id,
  });

  return { success: true, ...inviteLinkFromToken(survey.id, token) };
}

export async function regenerateAnonymousInviteLinkAction(surveyId: string) {
  const session = await requireAdminSession();

  return runLoggedAction(
    "regenerateAnonymousInviteLinkAction",
    session.user.id,
    async () => {
      const parsed = parseSchema(surveyIdParamSchema, surveyId);

      if (!parsed.success) {
        return { error: portalCopy.errors.declarationNotFound };
      }

      const survey = await getSurveyForAdmin(parsed.data);

      if (!survey) {
        return { error: portalCopy.errors.declarationNotFound };
      }

      const token = await regenerateInviteToken({
        surveyId: survey.id,
        createdBy: session.user.id,
      });

      revalidatePath("/dashboard");
      revalidatePath(`/dashboard/${survey.id}`);

      return { success: true, ...inviteLinkFromToken(survey.id, token) };
    },
  );
}

export async function loadAnonymousInviteLinkForSurvey(
  surveyId: string,
  createdBy: string,
) {
  const survey = await getSurveyForAdmin(surveyId);
  if (!survey) {
    return null;
  }

  const token = await getOrCreateInviteToken({
    surveyId: survey.id,
    createdBy,
  });

  return inviteLinkFromToken(survey.id, token);
}

export async function recordEmailInvitationAction(formData: FormData) {
  const session = await requireAdminSession();

  return runLoggedAction(
    "recordEmailInvitationAction",
    session.user.id,
    async () => {
      const parsed = parseSchema(recordEmailInvitationSchema, {
        surveyId: String(formData.get("surveyId") ?? "").trim(),
        email: String(formData.get("email") ?? "").trim().toLowerCase(),
      });

      if (!parsed.success) {
        return { error: portalCopy.invite.recordError };
      }

      const { surveyId, email } = parsed.data;

      const survey = await getSurveyForAdmin(surveyId);
      if (!survey) {
        return { error: portalCopy.errors.declarationNotFound };
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

      await recordAuditEvent({
        actorId: session.user.id,
        eventType: "invite.issued",
        resourceType: "declaration",
        resourceId: survey.id,
        metadata: { channel: "anonymous_email" },
      });

      revalidatePath(`/dashboard/${survey.id}`);

      const { combined } = buildAnonymousEmailMessage(url);
      return { success: true, combined, url };
    },
  );
}
