import "server-only";

/**
 * S5 secure declaration link entry (`/f/[token]`).
 *
 * Resolves `survey_invite_tokens` only — never `surveys.slug` or `client_invitations`.
 * Redirect-only: session dispatch lives in `public-link-routing.ts`.
 *
 * **Not** S6 legacy `/invite/[token]` (see `legacy-invite-entry.ts`).
 *
 * @see docs/architecture/slices/s5-share-access.md
 */
import { portalCopy } from "@/lib/copy/portal-copy";
import { secureLinkHref } from "@/lib/routing/portal-routes";
import {
  buildPublicLinkMetadata,
  createCachedPublicLinkSurveyLoader,
  resolvePublicLinkReturnTo,
  runPublicLinkRedirect,
} from "@/lib/pages/public-link-page";
import { surveyInviteTokenParamSchema } from "@/lib/schemas/surveys";
import { getSurveyByInviteToken } from "@/lib/domain/surveys";

export const loadSecureLinkSurvey = createCachedPublicLinkSurveyLoader(
  surveyInviteTokenParamSchema,
  getSurveyByInviteToken,
);

/** Doctrine alias (S5) — name is historical; loads `survey_invite_tokens`, not S6 `client_invitations`. */
export const loadAnonymousInviteLinkForSurvey = loadSecureLinkSurvey;

export async function secureLinkPageMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  return buildPublicLinkMetadata({
    rawValue: token,
    loadSurvey: loadSecureLinkSurvey,
    missingTitle: portalCopy.metadata.secureLink.title,
    missingDescription: portalCopy.declarationPage.secureDescription,
    surveyDescription: portalCopy.declarationPage.secureDescription,
  });
}

/** Resolves a secure invite token and routes to the correct authenticated landing. */
export async function runSecureLinkPage({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<never> {
  const { token } = await params;

  return runPublicLinkRedirect({
    rawValue: token,
    loadSurvey: loadSecureLinkSurvey,
    resolveReturnTo: (survey) =>
      resolvePublicLinkReturnTo(
        token,
        survey,
        surveyInviteTokenParamSchema,
        secureLinkHref,
        (rawValue) => secureLinkHref(rawValue.trim()),
      ),
  });
}
