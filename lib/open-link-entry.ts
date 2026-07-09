import "server-only";

/**
 * S5 open declaration link entry (`/survey/[slug]`).
 *
 * Resolves `surveys.slug` only — not secure tokens (`/f/[token]`).
 * Redirect-only: session dispatch lives in `public-link-routing.ts`.
 *
 * @see docs/architecture/slices/s5-share-access.md
 */
import { portalCopy } from "@/lib/portal-copy";
import { openSurveyHref } from "@/lib/portal-routes";
import {
  buildPublicLinkMetadata,
  createCachedPublicLinkSurveyLoader,
  resolvePublicLinkReturnTo,
  runPublicLinkRedirect,
} from "@/lib/public-link-page";
import { openSurveySlugParamSchema } from "@/lib/schemas/surveys";
import { getSurveyBySlug } from "@/lib/surveys";

export const loadOpenLinkSurvey = createCachedPublicLinkSurveyLoader(
  openSurveySlugParamSchema,
  getSurveyBySlug,
);

/** Doctrine alias (S5) — open slug resolves to survey via `surveys.slug`. */
export const loadPublicSurveyBySlug = loadOpenLinkSurvey;

export async function openLinkPageMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return buildPublicLinkMetadata({
    rawValue: slug,
    loadSurvey: loadOpenLinkSurvey,
    missingTitle: portalCopy.metadata.openLink.title,
    missingDescription: portalCopy.metadata.openLink.description,
    surveyDescription: portalCopy.declarationPage.publicDescription,
  });
}

/** Resolves a public slug and routes to sign-in or the assigned declaration. */
export async function runOpenLinkPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<never> {
  const { slug } = await params;

  return runPublicLinkRedirect({
    rawValue: slug,
    loadSurvey: loadOpenLinkSurvey,
    resolveReturnTo: (survey) =>
      resolvePublicLinkReturnTo(
        slug,
        survey,
        openSurveySlugParamSchema,
        openSurveyHref,
        (_rawValue, resolvedSurvey) => openSurveyHref(resolvedSurvey.slug),
      ),
  });
}
