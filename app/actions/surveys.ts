"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePlatformOperatorSession } from "@/modules/identity/auth/platform-operator-session";
import { isAdminSession } from "@/modules/identity/admin";
import { requirePlatformPermission } from "@/modules/identity/domain/platform-rbac-access";
import { recordAuditEvent } from "@/modules/platform/audit";
import { createClientAssignment } from "@/modules/declarations/domain/clients";
import {
  ORGANIZATION_ADMIN_CLIENTS_HREF,
  ORGANIZATION_ADMIN_DASHBOARD_HREF,
  organizationAdminDeclarationHref,
  organizationAdminDeclarationManageHref,
} from "@/modules/platform/routing/portal-routes";
import {
  listQuestionsForSurvey,
  replaceSurveyQuestions,
  SurveyHasResponsesError,
  type SurveyAnswers,
} from "@/modules/declarations/domain/questions";
import { runLoggedAction } from "@/modules/platform/observability";
import { portalCopy } from "@/modules/platform/copy/portal-copy";
import { parseSchema } from "@/modules/platform/schemas/common";
import {
  deleteSurveySchema,
  rawUpdateSurveyFromFormData,
  submitSurveyResponseSchema,
  surveyIdParamSchema,
  updateSurveySchema,
} from "@/modules/declarations/schemas/surveys";
import { DRAFT_SURVEY_TITLE } from "@/modules/declarations/domain/survey-draft";
import {
  buildCdpPackageForExport,
  cdpQuestionsToDrafts,
  cdpToMetadata,
  parseCdpPackage,
  serializeCdpPackage,
  type CdpPackage,
} from "@/modules/declarations/domain/survey-package";
import {
  analyzeCdpPackageInput,
  type PackageAnalysis,
} from "@/modules/declarations/domain/survey-package-analyze";
import {
  createSurvey,
  deleteSurvey,
  getSurveyForAdmin,
  pickSurveyMetadata,
  regenerateInviteToken,
  updateSurvey,
} from "@/modules/declarations/domain/surveys";
import { formString } from "@/modules/declarations/server-actions/form-data";

function revalidateOperatorDashboard(surveyId?: string) {
  revalidatePath(ORGANIZATION_ADMIN_DASHBOARD_HREF);
  if (surveyId) {
    revalidatePath(organizationAdminDeclarationHref(surveyId));
  }
}

async function requireDeclarationsManageOrg(userId: string, isNeonAdmin: boolean) {
  const { organizationId, check } = await requirePlatformPermission({
    userId,
    code: "declarations.manage",
    isNeonAdmin,
  });
  return { organizationId, allowed: check.allowed };
}

function mapUpdateSurveyError(error: string) {
  return error.includes("id")
    ? portalCopy.errors.declarationNotFound
    : portalCopy.errors.titleRequired;
}

async function applyCdpPackageToSurvey(
  surveyId: string,
  pkg: CdpPackage,
  actorId: string,
  createAssignment: boolean,
  organizationId?: string,
): Promise<
  | { assignmentCreated: boolean }
  | { error: string; assignmentCreated: false }
> {
  const metadata = cdpToMetadata(pkg.metadata ?? {});

  await updateSurvey({
    id: surveyId,
    title: pkg.declaration.title,
    question: pkg.declaration.intro ?? pkg.declaration.title,
    metadata,
  });

  const drafts = cdpQuestionsToDrafts(pkg.declaration.questions);
  try {
    await replaceSurveyQuestions(
      surveyId,
      drafts.map((question) => ({
        prompt: question.prompt,
        type: question.type,
        required: question.required,
        config: question.config,
      })),
    );
  } catch (error) {
    if (error instanceof SurveyHasResponsesError) {
      return { error: portalCopy.errors.questionsLocked, assignmentCreated: false };
    }
    throw error;
  }

  let assignmentCreated = false;
  if (createAssignment && pkg.assignment?.clientEmail) {
    await createClientAssignment({
      surveyId,
      clientEmail: pkg.assignment.clientEmail,
      assignedBy: actorId,
      dueDate: pkg.assignment.dueDate
        ? new Date(`${pkg.assignment.dueDate}T23:59:59.000Z`)
        : metadata.submitBefore ?? undefined,
      organizationId,
    });
    assignmentCreated = true;
  }

  return { assignmentCreated };
}

function parseValidatedPackage(
  packageJson: string,
):
  | { ok: true; analysis: PackageAnalysis; pkg: CdpPackage }
  | { ok: false; error: string; analysis?: PackageAnalysis } {
  const analysis = analyzeCdpPackageInput({ packageJson });

  if (!analysis.canIngest || !analysis.valid) {
    return {
      ok: false,
      error: portalCopy.declarationDetail.package.ingestBlocked,
      analysis,
    };
  }

  let raw: unknown;
  try {
    raw = JSON.parse(packageJson);
  } catch {
    return { ok: false, error: portalCopy.declarationDetail.package.invalidJson };
  }

  const parsed = parseCdpPackage(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: portalCopy.declarationDetail.package.invalidSchema,
    };
  }

  return { ok: true, analysis, pkg: parsed.data };
}

export async function createDraftSurveyAction() {
  const session = await requirePlatformOperatorSession({ anyOf: ["declarations.manage"] });

  return runLoggedAction("createDraftSurveyAction", session.user.id, async () => {
    const { organizationId, allowed } = await requireDeclarationsManageOrg(
      session.user.id,
      isAdminSession(session),
    );
    if (!allowed) {
      redirect(ORGANIZATION_ADMIN_DASHBOARD_HREF);
    }
    const survey = await createSurvey({
      title: DRAFT_SURVEY_TITLE,
      question: "",
      userId: session.user.id,
      organizationId,
    });

    await recordAuditEvent({
      actorId: session.user.id,
      eventType: "declaration.created",
      resourceType: "declaration",
      resourceId: survey.id,
      metadata: { title: survey.title, draft: true },
    });

    revalidateOperatorDashboard();
    redirect(organizationAdminDeclarationManageHref(survey.id));
  });
}

export async function updateSurveyAction(formData: FormData) {
  const session = await requirePlatformOperatorSession({ anyOf: ["declarations.manage"] });

  return runLoggedAction("updateSurveyAction", session.user.id, async () => {
    const parsed = parseSchema(
      updateSurveySchema,
      rawUpdateSurveyFromFormData(formData),
    );

    if (!parsed.success) {
      return { error: mapUpdateSurveyError(parsed.error) };
    }

    const { id, title, question, questions, metadata } = parsed.data;

    const { organizationId, allowed } = await requireDeclarationsManageOrg(
      session.user.id,
      isAdminSession(session),
    );
    if (!allowed) {
      return { error: portalCopy.accessDenied.description };
    }

    const existing = await getSurveyForAdmin(id, organizationId);
    if (!existing) {
      return { error: portalCopy.errors.declarationNotFound };
    }

    await updateSurvey({
      id,
      title,
      question: question || title,
      metadata: metadata ?? pickSurveyMetadata(existing),
      organizationId,
    });

    if (questions.length > 0) {
      try {
        await replaceSurveyQuestions(id, questions);
      } catch (error) {
        if (error instanceof SurveyHasResponsesError) {
          return { error: portalCopy.errors.questionsLocked };
        }
        throw error;
      }
    }

    await recordAuditEvent({
      actorId: session.user.id,
      eventType: "declaration.updated",
      resourceType: "declaration",
      resourceId: id,
    });

    revalidateOperatorDashboard(id);
    redirect(organizationAdminDeclarationHref(id));
  });
}

export async function deleteSurveyAction(formData: FormData) {
  const session = await requirePlatformOperatorSession({ anyOf: ["declarations.manage"] });

  return runLoggedAction("deleteSurveyAction", session.user.id, async () => {
    const parsed = parseSchema(deleteSurveySchema, {
      id: formString(formData, "id"),
    });

    if (!parsed.success) {
      return { error: portalCopy.errors.declarationNotFound };
    }

    const { id } = parsed.data;

    const { organizationId, allowed } = await requireDeclarationsManageOrg(
      session.user.id,
      isAdminSession(session),
    );
    if (!allowed) {
      return { error: portalCopy.accessDenied.description };
    }

    const existing = await getSurveyForAdmin(id, organizationId);
    if (!existing) {
      return { error: portalCopy.errors.declarationNotFound };
    }

    await deleteSurvey(id, organizationId);

    await recordAuditEvent({
      actorId: session.user.id,
      eventType: "declaration.deleted",
      resourceType: "declaration",
      resourceId: id,
    });

    revalidateOperatorDashboard();
    return { success: true as const };
  });
}

/** Reserved for anonymous/public submit (S4). Portal routes currently require sign-in. */
export async function submitSurveyResponseAction(input: {
  slug: string;
  answers: SurveyAnswers;
}) {
  return runLoggedAction("submitSurveyResponseAction", undefined, async () => {
    const parsed = parseSchema(submitSurveyResponseSchema, input);
    if (!parsed.success) {
      return { error: portalCopy.errors.declarationNotFound };
    }

    return { error: portalCopy.errors.signInRequired };
  });
}

export async function exportSurveyPackageAction(surveyId: string) {
  const session = await requirePlatformOperatorSession({ anyOf: ["declarations.manage"] });

  return runLoggedAction("exportSurveyPackageAction", session.user.id, async () => {
    const parsed = parseSchema(surveyIdParamSchema, surveyId);
    if (!parsed.success) {
      return { error: portalCopy.errors.declarationNotFound };
    }

    const { organizationId, allowed } = await requireDeclarationsManageOrg(
      session.user.id,
      isAdminSession(session),
    );
    if (!allowed) {
      return { error: portalCopy.accessDenied.description };
    }

    const survey = await getSurveyForAdmin(parsed.data, organizationId);
    if (!survey) {
      return { error: portalCopy.errors.declarationNotFound };
    }

    const questions = await listQuestionsForSurvey(parsed.data);
    const pkg = buildCdpPackageForExport({ survey, questions });
    return { packageJson: serializeCdpPackage(pkg) };
  });
}

export async function validateSurveyPackageAction(input: {
  packageJson: string;
  fileName?: string;
}) {
  const session = await requirePlatformOperatorSession({ anyOf: ["declarations.manage"] });

  return runLoggedAction(
    "validateSurveyPackageAction",
    session.user.id,
    async () => analyzeCdpPackageInput(input),
  );
}

export async function importSurveyPackageAction(input: {
  surveyId: string;
  packageJson: string;
  createAssignment?: boolean;
}) {
  const session = await requirePlatformOperatorSession({ anyOf: ["declarations.manage"] });

  return runLoggedAction("importSurveyPackageAction", session.user.id, async () => {
    const parsedSurveyId = parseSchema(surveyIdParamSchema, input.surveyId);
    if (!parsedSurveyId.success) {
      return { error: portalCopy.errors.declarationNotFound };
    }

    const { organizationId, allowed } = await requireDeclarationsManageOrg(
      session.user.id,
      isAdminSession(session),
    );
    if (!allowed) {
      return { error: portalCopy.accessDenied.description };
    }

    const survey = await getSurveyForAdmin(parsedSurveyId.data, organizationId);
    if (!survey) {
      return { error: portalCopy.errors.declarationNotFound };
    }

    const validated = parseValidatedPackage(input.packageJson);
    if (!validated.ok) {
      return validated.analysis
        ? { error: validated.error, analysis: validated.analysis }
        : { error: validated.error };
    }

    const { analysis, pkg } = validated;

    const applied = await applyCdpPackageToSurvey(
      survey.id,
      pkg,
      session.user.id,
      input.createAssignment ?? true,
      organizationId,
    );

    if ("error" in applied) {
      return { error: applied.error, analysis };
    }

    const { assignmentCreated } = applied;

    await recordAuditEvent({
      actorId: session.user.id,
      eventType: "declaration.imported",
      resourceType: "declaration",
      resourceId: survey.id,
      metadata: {
        cdpVersion: pkg.cdpVersion,
        confidence: analysis.confidence,
        assignmentCreated,
      },
    });

    revalidateOperatorDashboard(survey.id);
    revalidatePath(ORGANIZATION_ADMIN_CLIENTS_HREF);

    return {
      success: true as const,
      analysis,
      assignmentCreated,
    };
  });
}

export async function regenerateInviteTokenAction(formData: FormData) {
  const session = await requirePlatformOperatorSession({ anyOf: ["declarations.manage"] });

  return runLoggedAction(
    "regenerateInviteTokenAction",
    session.user.id,
    async () => {
      const parsed = parseSchema(
        surveyIdParamSchema,
        formString(formData, "surveyId"),
      );
      if (!parsed.success) {
        return { error: portalCopy.errors.declarationNotFound };
      }

      const { organizationId, allowed } = await requireDeclarationsManageOrg(
        session.user.id,
        isAdminSession(session),
      );
      if (!allowed) {
        return { error: portalCopy.accessDenied.description };
      }

      const survey = await getSurveyForAdmin(parsed.data, organizationId);
      if (!survey) {
        return { error: portalCopy.errors.declarationNotFound };
      }

      await regenerateInviteToken({
        surveyId: parsed.data,
        createdBy: session.user.id,
      });

      await recordAuditEvent({
        actorId: session.user.id,
        eventType: "declaration.secure_link_rotated",
        resourceType: "declaration",
        resourceId: parsed.data,
      });

      revalidateOperatorDashboard(parsed.data);
      return { success: true as const };
    },
  );
}
