"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminSession } from "@/app/actions/admin";
import { isAdminSession } from "@/lib/admin";
import { recordAuditEvent } from "@/lib/audit";
import { auth } from "@/lib/auth/server";
import { getAppBaseUrl } from "@/lib/app-url";
import {
  ensureClientProfileRow,
  completeClientAssignment,
  createClientInvitation,
  createConfirmationCode,
  getClientAssignmentForUser,
  getClientInvitationByToken,
  getClientProfile,
  acknowledgeClientPortal,
  markClientInvitationAccepted,
  normalizeEmail,
  upsertClientProfile,
} from "@/lib/clients";
import { runLoggedAction } from "@/lib/observability";
import { portalCopy, CLIENT_PORTAL_ACK_VERSION } from "@/lib/portal-copy";
import {
  isPlaygroundEmbedRequest,
  isPlaygroundEnabled,
} from "@/lib/playground";
import { getPreviewClientUser } from "@/lib/preview-client";
import { getSurveyBySlug } from "@/lib/surveys";
import { submitAnswersForSurvey } from "@/app/actions/surveys";
import type { SurveyAnswers } from "@/lib/questions";
import { parseSchema } from "@/lib/schemas/common";
import {
  acceptClientInviteSchema,
  clientOnboardingSchema,
  clientSignInSchema,
  issueClientInviteSchema,
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
    redirect("/");
  }

  if (isAdminSession(session)) {
    redirect("/dashboard");
  }

  if (options?.requireOnboarding) {
    const profile = await getClientProfile(session.user.id);
    if (!profile?.onboardingComplete) {
      redirect("/client/onboarding");
    }
  }

  return session;
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

    const profile = session?.user?.id
      ? await getClientProfile(session.user.id)
      : null;

    if (!profile?.onboardingComplete) {
      redirect("/client/onboarding");
    }

    redirect("/client");
  });
}

export async function acceptClientInviteAction(formData: FormData) {
  return runLoggedAction("acceptClientInviteAction", undefined, async () => {
    const parsed = parseSchema(acceptClientInviteSchema, {
      token: String(formData.get("token") ?? "").trim(),
      password: String(formData.get("password") ?? ""),
      confirmPassword: String(formData.get("confirmPassword") ?? ""),
    });

    if (!parsed.success) {
      if (parsed.error.includes("match")) {
        return { error: portalCopy.clientInvite.passwordMismatch };
      }
      if (parsed.error.includes("8")) {
        return { error: portalCopy.clientInvite.weakPassword };
      }
      return { error: portalCopy.clientInvite.missingToken };
    }

    const { token, password } = parsed.data;

    const invitation = await getClientInvitationByToken(token);

    if (!invitation) {
      return { error: portalCopy.clientInvite.invalidToken };
    }

    if (invitation.status === "expired") {
      return { error: portalCopy.clientInvite.expired };
    }

    if (invitation.status === "accepted") {
      return { error: portalCopy.clientInvite.alreadyAccepted };
    }

    const { error } = await auth.signUp.email({
      email: invitation.email,
      password,
      name: invitation.fullName,
    });

    if (error) {
      return { error: error.message ?? portalCopy.clientInvite.acceptFailed };
    }

    await markClientInvitationAccepted(invitation.id);

    const { data: session } = await auth.getSession();
    if (session?.user?.id) {
      await ensureClientProfileRow(session.user.id);
    }

    await recordAuditEvent({
      actorId: session?.user?.id,
      eventType: "invite.accepted",
      resourceType: "client_invitation",
      resourceId: invitation.id,
    });

    redirect("/client/onboarding");
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
  const session = await requireAdminSession();

  return runLoggedAction(
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

      const invitation = await createClientInvitation({
        email,
        fullName,
        invitedBy: session.user.id,
        surveyId: surveyId || undefined,
        dueDate:
          dueDate && !Number.isNaN(dueDate.getTime()) ? dueDate : undefined,
      });

      await recordAuditEvent({
        actorId: session.user.id,
        eventType: "invite.issued",
        resourceType: "client_invitation",
        resourceId: invitation.id,
        metadata: { channel: "client" },
      });

      const inviteUrl = `${getAppBaseUrl()}/invite/${invitation.token}`;
      revalidatePath("/dashboard/clients");

      return {
        success: true,
        inviteUrl,
        email: normalizeEmail(email),
      };
    },
  );
}
