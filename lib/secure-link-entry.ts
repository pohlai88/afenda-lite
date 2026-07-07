import "server-only";

import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { PORTAL_NAME, portalCopy } from "@/lib/portal-copy";
import {
  publicLinkPageRobots,
  resolvePublicLinkLandingHref,
} from "@/lib/public-link-routing";
import { secureLinkHref } from "@/lib/portal-routes";
import { surveyInviteTokenParamSchema } from "@/lib/schemas/surveys";
import { getSurveyByInviteToken } from "@/lib/surveys";

export const loadSecureLinkSurvey = cache(async (rawToken: string) => {
  const parsed = surveyInviteTokenParamSchema.safeParse(rawToken);
  if (!parsed.success) {
    return null;
  }

  return getSurveyByInviteToken(parsed.data);
});

/** Doctrine alias (S5) — secure token resolves to survey via `survey_invite_tokens`. */
export const loadAnonymousInviteLinkForSurvey = loadSecureLinkSurvey;

export async function secureLinkPageMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  const survey = await loadSecureLinkSurvey(token);

  if (!survey) {
    return {
      title: `${PORTAL_NAME} — ${portalCopy.metadata.secureLink.title}`,
      description: portalCopy.declarationPage.secureDescription,
      robots: publicLinkPageRobots,
    };
  }

  return {
    title: `${PORTAL_NAME} — ${survey.title}`,
    description: portalCopy.declarationPage.secureDescription,
    robots: publicLinkPageRobots,
  };
}

/** Resolves a secure invite token and routes to the correct authenticated landing. */
export async function runSecureLinkPage({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<never> {
  const { token } = await params;
  const survey = await loadSecureLinkSurvey(token);

  if (!survey) {
    notFound();
  }

  const parsed = surveyInviteTokenParamSchema.safeParse(token);
  const returnTo =
    parsed.success ? secureLinkHref(parsed.data) : secureLinkHref(token.trim());

  redirect(
    await resolvePublicLinkLandingHref(survey, {
      returnTo,
    }),
  );
}
