"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminSession } from "@/app/actions/admin";
import { isAdminSession } from "@/lib/admin";
import { normalizeEmail } from "@/lib/client";
import { auth } from "@/lib/auth/server";
import { getAppBaseUrl } from "@/lib/app-url";
import { portalCopy } from "@/lib/portal-copy";
import {
  completeClientAssignment,
  createClientInvitation,
  createConfirmationCode,
  getClientAssignmentForUser,
  getClientInvitationByToken,
  getClientProfile,
  markClientInvitationAccepted,
  upsertClientProfile,
} from "@/lib/clients";
import { getSurveyBySlug } from "@/lib/surveys";
import { submitAnswersForSurvey } from "@/app/actions/surveys";
import type { SurveyAnswers } from "@/lib/questions";

export async function requireClientSession() {
  const { data: session } = await auth.getSession();

  if (!session?.user?.id || !session.user.email) {
    redirect("/client/login");
  }

  if (isAdminSession(session)) {
    redirect("/dashboard");
  }

  return session;
}

export async function clientSignInAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  const { error } = await auth.signIn.email({ email, password });

  if (error) {
    return { error: error.message ?? portalCopy.clientAuth.invalidCredentials };
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
}

export async function acceptClientInviteAction(formData: FormData) {
  const token = String(formData.get("token") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!token) {
    return { error: portalCopy.clientInvite.missingToken };
  }

  if (password.length < 8) {
    return { error: portalCopy.clientInvite.weakPassword };
  }

  if (password !== confirmPassword) {
    return { error: portalCopy.clientInvite.passwordMismatch };
  }

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
    await upsertClientProfile({
      userId: session.user.id,
      phone: "",
      entityName: "",
      jurisdiction: "",
      notes: "",
      onboardingComplete: false,
    });
  }

  redirect("/client/onboarding");
}

export async function saveClientOnboardingAction(formData: FormData) {
  const session = await requireClientSession();
  const phone = String(formData.get("phone") ?? "").trim();
  const entityName = String(formData.get("entityName") ?? "").trim();
  const jurisdiction = String(formData.get("jurisdiction") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  if (!phone || !entityName || !jurisdiction) {
    return { error: portalCopy.clientOnboarding.requiredError };
  }

  await upsertClientProfile({
    userId: session.user.id,
    phone,
    entityName,
    jurisdiction,
    notes,
    onboardingComplete: true,
  });

  redirect("/client");
}

export async function submitClientDeclarationAction(input: {
  assignmentId: string;
  slug: string;
  answers: SurveyAnswers;
}) {
  const session = await requireClientSession();
  const { assignmentId, slug, answers } = input;

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
  revalidatePath("/client");
  revalidatePath("/dashboard");

  return { success: true, confirmationCode };
}

export async function issueClientInviteAction(formData: FormData) {
  const session = await requireAdminSession();

  const email = String(formData.get("email") ?? "").trim();
  const fullName = String(formData.get("fullName") ?? "").trim();
  const surveyId = String(formData.get("surveyId") ?? "").trim() || undefined;

  if (!email.includes("@") || !fullName) {
    return { error: portalCopy.clientInvite.issueError };
  }

  const invitation = await createClientInvitation({
    email,
    fullName,
    invitedBy: session.user.id,
    surveyId,
  });

  const inviteUrl = `${getAppBaseUrl()}/invite/${invitation.token}`;
  revalidatePath("/dashboard/clients");

  return {
    success: true,
    inviteUrl,
    email: normalizeEmail(email),
  };
}
