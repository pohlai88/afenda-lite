"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminSession } from "@/app/actions/admin";
import { isAdminSession } from "@/lib/admin";
import { recordAuditEvent } from "@/lib/audit";
import { auth } from "@/lib/auth/server";
import { buildClientAccessMessage } from "@/lib/client-access-message";
import { ensureClientAuthUser } from "@/lib/client-auth-provision";
import { isMailerSendConfigured } from "@/lib/email/mailersend-config";
import { sendClientAccessEmail } from "@/lib/email/send-client-access-email";
import { getClientDefaultPassword } from "@/lib/client-default-password";
import { bootstrapClientAfterSupabaseAuth } from "@/lib/auth/bootstrap-client-invite";
import {
  completeClientAssignment,
  createClientInvitation,
  createConfirmationCode,
  deleteClientAssignmentById,
  deleteClientAssignmentsForEmail,
  deleteClientInvitationById,
  deleteClientProfileByUserId,
  getClientAssignmentForUser,
  getClientInvitationById,
  getClientProfile,
  acknowledgeClientPortal,
  normalizeEmail,
  upsertClientProfile,
} from "@/lib/clients";
import { deleteClientAuthUserByEmail } from "@/lib/delete-client-auth-user";
import { runLoggedAction } from "@/lib/observability";
import { portalCopy, CLIENT_PORTAL_ACK_VERSION } from "@/lib/portal-copy";
import {
  isPlaygroundEmbedRequest,
  isPlaygroundEnabled,
} from "@/lib/playground";
import { getPreviewClientUser } from "@/lib/preview-client";
import { getSurveyBySlug, getSurveyForAdmin } from "@/lib/surveys";
import { submitAnswersForSurvey } from "@/app/actions/surveys";
import type { SurveyAnswers } from "@/lib/questions";
import { debugAgentLog } from "@/lib/debug-agent-log";
import { parseSchema } from "@/lib/schemas/common";
import {
  clientOnboardingSchema,
  clientSignInSchema,
  deleteClientAssignmentSchema,
  issueClientInviteSchema,
  removeClientRegistrationSchema,
  submitClientDeclarationSchema,
} from "@/lib/schemas/client";

export async function requireClientSession(options?: {
  requireOnboarding?: boolean;
}) {
  const { data: session } = await auth.getSession();
  const embed = await isPlaygroundEmbedRequest();

  if (
    embed &&
    isPlaygroundEnabled() &&
    isAdminSession(session) &&
    session?.user
  ) {
    const previewUser = await getPreviewClientUser();
    if (!previewUser) {
      redirect("/client/preview-unavailable?embed=1");
    }

    const syntheticSession = {
      ...session,
      user: {
        ...session.user,
        id: previewUser.id,
        email: previewUser.email,
        name: previewUser.name,
      },
    };

    if (options?.requireOnboarding) {
      const profile = await getClientProfile(previewUser.id);
      if (!profile?.onboardingComplete) {
        redirect("/client/onboarding");
      }
    }

    return syntheticSession;
  }

  if (!session?.user?.id || !session.user.email) {
    debugAgentLog({
      location: "app/actions/client.ts:requireClientSession",
      message: "missing session user id or email — redirect home",
      hypothesisId: "D",
      data: {
        hasSession: Boolean(session),
        hasUserId: Boolean(session?.user?.id),
        hasEmail: Boolean(session?.user?.email),
      },
    });
    redirect("/");
  }

  const authenticatedSession = {
    ...session,
    user: {
      ...session.user,
      id: session.user.id,
      email: session.user.email,
    },
  };

  if (isAdminSession(authenticatedSession)) {
    redirect("/dashboard");
  }

  if (options?.requireOnboarding) {
    let profile = null;
    try {
      profile = await getClientProfile(authenticatedSession.user.id);
    } catch (error) {
      debugAgentLog({
        location: "app/actions/client.ts:requireClientSession",
        message: "getClientProfile failed during onboarding gate",
        hypothesisId: "A",
        data: {
          userId: authenticatedSession.user.id,
          error: error instanceof Error ? error.message : "unknown",
        },
      });
      throw error;
    }

    debugAgentLog({
      location: "app/actions/client.ts:requireClientSession",
      message: "onboarding gate evaluated",
      hypothesisId: "C",
      data: {
        userId: authenticatedSession.user.id,
        profileExists: Boolean(profile),
        onboardingComplete: Boolean(profile?.onboardingComplete),
      },
    });

    if (!profile?.onboardingComplete) {
      redirect("/client/onboarding");
    }
  }

  debugAgentLog({
    location: "app/actions/client.ts:requireClientSession",
    message: "client session resolved",
    hypothesisId: "D",
    data: {
      userId: authenticatedSession.user.id,
      requireOnboarding: Boolean(options?.requireOnboarding),
    },
  });

  return authenticatedSession;
}

export async function clientSignInAction(formData: FormData) {
  return runLoggedAction("clientSignInAction", undefined, async () => {
    const parsed = parseSchema(clientSignInSchema, {
      email: String(formData.get("email") ?? "").trim(),
      password: String(formData.get("password") ?? ""),
    });

    if (!parsed.success) {
      return { error: portalCopy.errors.emailPasswordRequired };
    }

    const { email, password } = parsed.data;

    const { error } = await auth.signIn.email({ email, password });

    if (error) {
      await recordAuditEvent({
        eventType: "auth.sign_in_failed",
        resourceType: "session",
        metadata: { surface: "client" },
      });
      return { error: error.message ?? portalCopy.signIn.invalidCredentials };
    }

    const { data: session } = await auth.getSession();

    if (isAdminSession(session)) {
      redirect("/dashboard");
    }

    if (session?.user?.id) {
      try {
        await bootstrapClientAfterSupabaseAuth({
          userId: session.user.id,
          email: session.user.email,
          userMetadata: null,
        });
        debugAgentLog({
          location: "app/actions/client.ts:clientSignInAction",
          message: "bootstrap after sign-in succeeded",
          hypothesisId: "C",
          data: { userId: session.user.id },
        });
      } catch (error) {
        debugAgentLog({
          location: "app/actions/client.ts:clientSignInAction",
          message: "bootstrap after sign-in failed",
          hypothesisId: "C",
          data: {
            userId: session.user.id,
            error: error instanceof Error ? error.message : "unknown",
          },
        });
        throw error;
      }
    }

    let profile = null;
    if (session?.user?.id) {
      try {
        profile = await getClientProfile(session.user.id);
      } catch (error) {
        debugAgentLog({
          location: "app/actions/client.ts:clientSignInAction",
          message: "getClientProfile after sign-in failed",
          hypothesisId: "A",
          data: {
            userId: session.user.id,
            error: error instanceof Error ? error.message : "unknown",
          },
        });
        throw error;
      }
    }

    if (!profile?.onboardingComplete) {
      redirect("/client/onboarding");
    }

    redirect("/client");
  });
}

export async function saveClientOnboardingAction(formData: FormData) {
  const session = await requireClientSession();

  return runLoggedAction(
    "saveClientOnboardingAction",
    session.user.id,
    async () => {
      const parsed = parseSchema(clientOnboardingSchema, {
        fullLegalName: String(formData.get("fullLegalName") ?? "").trim(),
        nationality: String(formData.get("nationality") ?? "").trim(),
        countryOfResidence: String(formData.get("countryOfResidence") ?? "").trim(),
        additionalResidenceCountries: formData
          .getAll("additionalResidenceCountries")
          .map((value) => String(value).trim())
          .filter(Boolean),
        passportIssuingCountry: String(
          formData.get("passportIssuingCountry") ?? "",
        ).trim(),
        passportNumber: String(formData.get("passportNumber") ?? "").trim(),
        phone: String(formData.get("phone") ?? "").trim(),
        entityName: String(formData.get("entityName") ?? "").trim(),
        jurisdiction: String(formData.get("jurisdiction") ?? "").trim(),
        notes: String(formData.get("notes") ?? "").trim(),
        identityConsent:
          formData.get("identityConsent") === "true" ? "true" : "",
      });

      if (!parsed.success) {
        return { error: portalCopy.clientOnboarding.requiredError };
      }

      const {
        fullLegalName,
        nationality,
        countryOfResidence,
        additionalResidenceCountries,
        passportIssuingCountry,
        passportNumber,
        phone,
        entityName,
        jurisdiction,
        notes,
      } = parsed.data;

      await upsertClientProfile({
        userId: session.user.id,
        fullLegalName,
        nationality,
        countryOfResidence,
        additionalResidenceCountries,
        passportIssuingCountry,
        passportNumber,
        phone,
        entityName,
        jurisdiction,
        notes,
        identityConsentAt: new Date(),
        onboardingComplete: true,
      });

      await recordAuditEvent({
        actorId: session.user.id,
        eventType: "profile.completed",
        resourceType: "client_profile",
        resourceId: session.user.id,
        metadata: { surface: "client" },
      });

      redirect("/client");
    },
  );
}

export async function acknowledgeClientPortalAction() {
  const session = await requireClientSession({ requireOnboarding: true });

  return runLoggedAction(
    "acknowledgeClientPortalAction",
    session.user.id,
    async () => {
      await acknowledgeClientPortal({
        userId: session.user.id,
        version: CLIENT_PORTAL_ACK_VERSION,
      });

      await recordAuditEvent({
        actorId: session.user.id,
        eventType: "portal.acknowledged",
        resourceType: "client_profile",
        resourceId: session.user.id,
        metadata: { version: CLIENT_PORTAL_ACK_VERSION },
      });

      revalidatePath("/client");
      return { success: true };
    },
  );
}

export async function submitClientDeclarationAction(input: {
  assignmentId: string;
  slug: string;
  answers: SurveyAnswers;
}) {
  const session = await requireClientSession();

  return runLoggedAction(
    "submitClientDeclarationAction",
    session.user.id,
    async () => {
      const parsed = parseSchema(submitClientDeclarationSchema, input);

      if (!parsed.success) {
        return { error: portalCopy.clientDashboard.assignmentNotFound };
      }

      const { assignmentId, slug, answers } = parsed.data;

      const assignment = await getClientAssignmentForUser(
        assignmentId,
        session.user.email ?? "",
      );

      if (!assignment) {
        return { error: portalCopy.clientDashboard.assignmentNotFound };
      }

      if (assignment.status === "submitted") {
        return {
          error: portalCopy.clientDashboard.alreadySubmitted,
          confirmationCode: assignment.confirmationCode ?? undefined,
        };
      }

      const survey = await getSurveyBySlug(slug);
      if (!survey || survey.id !== assignment.surveyId) {
        return { error: portalCopy.clientDashboard.assignmentNotFound };
      }

      const confirmationCode = createConfirmationCode(assignmentId);
      const result = await submitAnswersForSurvey({
        surveyId: survey.id,
        answers,
        confirmationCode,
      });

      if (result.error) {
        return result;
      }

      await completeClientAssignment({ assignmentId, confirmationCode });

      await recordAuditEvent({
        actorId: session.user.id,
        eventType: "declaration.submitted",
        resourceType: "declaration",
        resourceId: survey.id,
        metadata: { surface: "client", assignmentId },
      });

      revalidatePath("/client");
      revalidatePath("/dashboard");

      return { success: true, confirmationCode };
    },
  );
}

export async function issueClientInviteAction(formData: FormData) {
  let session;

  try {
    session = await requireAdminSession();
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "digest" in error &&
      typeof (error as { digest?: string }).digest === "string" &&
      (error as { digest: string }).digest.startsWith("NEXT_")
    ) {
      throw error;
    }

    return { error: portalCopy.orgSignIn.accessDenied };
  }

  try {
    return await runLoggedAction(
      "issueClientInviteAction",
      session.user.id,
      async () => {
      const parsed = parseSchema(issueClientInviteSchema, {
        email: String(formData.get("email") ?? "").trim(),
        fullName: String(formData.get("fullName") ?? "").trim(),
        surveyId: String(formData.get("surveyId") ?? "").trim(),
        dueDate: String(formData.get("dueDate") ?? "").trim(),
      });

      if (!parsed.success) {
        return { error: portalCopy.clientInvite.issueError };
      }

      const { email, fullName, surveyId, dueDate: dueDateRaw } = parsed.data;
      const dueDate = dueDateRaw ? new Date(dueDateRaw) : undefined;

      const survey = await getSurveyForAdmin(surveyId);
      if (!survey) {
        return { error: portalCopy.errors.declarationNotFound };
      }

      const temporaryPassword = getClientDefaultPassword();

      const provision = await ensureClientAuthUser({
        email,
        fullName,
        password: temporaryPassword,
      });

      if (provision.error || !provision.userId) {
        return { error: portalCopy.clientInvite.provisionFailed };
      }

      const invitation = await createClientInvitation({
        email,
        fullName,
        invitedBy: session.user.id,
        surveyId: survey.id,
        dueDate:
          dueDate && !Number.isNaN(dueDate.getTime()) ? dueDate : undefined,
      });

      await bootstrapClientAfterSupabaseAuth({
        userId: provision.userId,
        email: normalizeEmail(email),
        userMetadata: { invitation_id: invitation.id },
      });

      const accessMessage = buildClientAccessMessage({
        clientEmail: normalizeEmail(email),
        temporaryPassword,
      });

      let emailSent = false;
      let emailError: string | undefined;

      if (isMailerSendConfigured()) {
        const emailDelivery = await sendClientAccessEmail({
          toEmail: normalizeEmail(email),
          toName: fullName,
          text: accessMessage,
        });
        emailSent = emailDelivery.ok;
        if (!emailDelivery.ok) {
          emailError = emailDelivery.error;
        }
      }

      await recordAuditEvent({
        actorId: session.user.id,
        eventType: "invite.issued",
        resourceType: "client_invitation",
        resourceId: invitation.id,
        metadata: {
          channel: "client_provision",
          emailSent,
          ...(emailError ? { emailError } : {}),
        },
      });

      revalidatePath("/dashboard/clients");

      return {
        success: true,
        email: normalizeEmail(email),
        accessMessage,
        emailSent,
        emailError,
      };
      },
    );
  } catch (error) {
    console.error("issueClientInviteAction failed", error);
    return { error: portalCopy.clientInvite.unexpectedError };
  }
}

export async function removeClientRegistrationAction(formData: FormData) {
  const session = await requireAdminSession();

  return runLoggedAction(
    "removeClientRegistrationAction",
    session.user.id,
    async () => {
      const parsed = parseSchema(removeClientRegistrationSchema, {
        invitationId: String(formData.get("invitationId") ?? "").trim(),
      });

      if (!parsed.success) {
        return { error: portalCopy.clientInvitationsPage.removeError };
      }

      const invitation = await getClientInvitationById(parsed.data.invitationId);
      if (!invitation) {
        return { error: portalCopy.clientInvitationsPage.removeMissing };
      }

      const email = normalizeEmail(invitation.email);
      const authResult = await deleteClientAuthUserByEmail(email);

      if (authResult.error) {
        return { error: authResult.error };
      }

      if (authResult.userId) {
        await deleteClientProfileByUserId(authResult.userId);
      }

      await deleteClientAssignmentsForEmail(email);
      await deleteClientInvitationById(invitation.id);

      await recordAuditEvent({
        actorId: session.user.id,
        eventType: "invite.removed",
        resourceType: "client_invitation",
        resourceId: invitation.id,
        metadata: { email, authUserRemoved: authResult.deleted === true },
      });

      revalidatePath("/dashboard/clients");
      return { success: true };
    },
  );
}

export async function deleteClientAssignmentAction(formData: FormData) {
  const session = await requireAdminSession();

  return runLoggedAction(
    "deleteClientAssignmentAction",
    session.user.id,
    async () => {
      const parsed = parseSchema(deleteClientAssignmentSchema, {
        assignmentId: String(formData.get("assignmentId") ?? "").trim(),
      });

      if (!parsed.success) {
        return { error: portalCopy.clientInvitationsPage.assignmentRemoveError };
      }

      await deleteClientAssignmentById(parsed.data.assignmentId);

      await recordAuditEvent({
        actorId: session.user.id,
        eventType: "assignment.removed",
        resourceType: "client_assignment",
        resourceId: parsed.data.assignmentId,
      });

      revalidatePath("/dashboard/clients");
      return { success: true };
    },
  );
}
