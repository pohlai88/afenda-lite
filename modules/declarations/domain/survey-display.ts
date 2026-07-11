import { portalCopy } from "@/modules/platform/copy/portal-copy";
import { isDraftSurveyTitle } from "@/modules/declarations/domain/survey-draft";

export function displaySurveyTitle(title: string, id: string) {
  if (isDraftSurveyTitle(title)) {
    return portalCopy.org.list.draftTitle(id.slice(0, 8));
  }
  return title;
}

export { DRAFT_SURVEY_TITLE, isDraftSurveyTitle } from "@/modules/declarations/domain/survey-draft";
