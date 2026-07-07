import "server-only";

import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { PORTAL_NAME, portalCopy } from "@/lib/portal-copy";
import { openSurveyHref } from "@/lib/portal-routes";
import {
  publicLinkPageRobots,
  resolvePublicLinkLandingHref,
} from "@/lib/public-link-routing";
import { openSurveySlugParamSchema } from "@/lib/schemas/surveys";
import { getSurveyBySlug } from "@/lib/surveys";

export const loadOpenLinkSurvey = cache(async (rawSlug: string) => {
  const parsed = openSurveySlugParamSchema.safeParse(rawSlug);
  if (!parsed.success) {
    return null;
  }

  return getSurveyBySlug(parsed.data);
});

/** Doctrine alias (S5) — open slug resolves to survey via `surveys.slug`. */
export const loadPublicSurveyBySlug = loadOpenLinkSurvey;

export async function openLinkPageMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const survey = await loadOpenLinkSurvey(slug);

  if (!survey) {
    return {
      title: `${PORTAL_NAME} — ${portalCopy.metadata.openLink.title}`,
      description: portalCopy.metadata.openLink.description,
      robots: publicLinkPageRobots,
    };
  }

  return {
    title: `${PORTAL_NAME} — ${survey.title}`,
    description: portalCopy.declarationPage.publicDescription,
    robots: publicLinkPageRobots,
  };
}

/** Resolves a public slug and routes to sign-in or the assigned declaration. */
export async function runOpenLinkPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<never> {
  const { slug } = await params;
  const survey = await loadOpenLinkSurvey(slug);

  if (!survey) {
    notFound();
  }

  const parsed = openSurveySlugParamSchema.safeParse(slug);
  const returnTo = parsed.success
    ? openSurveyHref(parsed.data)
    : openSurveyHref(survey.slug);

  redirect(
    await resolvePublicLinkLandingHref(survey, {
      returnTo,
    }),
  );
}
