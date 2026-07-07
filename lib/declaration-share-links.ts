import "server-only";

import { getAppBaseUrl, getClientSignInUrl } from "@/lib/app-url";
import { openSurveyHref, secureLinkHref } from "@/lib/portal-routes";
import { getOrCreateInviteToken } from "@/lib/surveys";

export type DeclarationShareLinks = {
  loginUrl: string;
  openLinkUrl: string;
  secureLinkUrl: string;
};

export async function loadDeclarationShareLinks(input: {
  surveyId: string;
  slug: string;
  createdBy: string;
}): Promise<DeclarationShareLinks> {
  const token = await getOrCreateInviteToken({
    surveyId: input.surveyId,
    createdBy: input.createdBy,
  });
  const baseUrl = getAppBaseUrl();

  return {
    loginUrl: getClientSignInUrl(),
    openLinkUrl: `${baseUrl}${openSurveyHref(input.slug)}`,
    secureLinkUrl: `${baseUrl}${secureLinkHref(token)}`,
  };
}
