import type { ReactNode } from "react";
import {
  CalendarClockIcon,
  ClipboardListIcon,
  InboxIcon,
} from "lucide-react";
import { PortalStatisticsCard } from "@/components/portal/portal-statistics-card";
import { SurveyDetailTabs } from "@/components/survey-detail-tabs";
import { formatDate } from "@/lib/format";
import { portalCopy } from "@/lib/copy/portal-copy";
import type { Survey } from "@/lib/domain/surveys";

/** dashboard-shell-05 — declaration workspace overview + tabbed panels. */
export function PortalDeclarationWorkspace({
  survey,
  responseCount,
  questionCount,
  labels,
  manage,
  share,
  submissions,
}: {
  survey: Survey;
  responseCount: number;
  questionCount: number;
  labels: {
    manage: string;
    manageHint: string;
    share: string;
    shareHint: string;
    submissions: string;
    submissionsHint: string;
  };
  manage: ReactNode;
  share: ReactNode;
  submissions: ReactNode;
}) {
  const { declarationDetail, org } = portalCopy;
  const { metadata, workspace } = declarationDetail;
  const deadlineLabel = survey.submitBefore
    ? formatDate(survey.submitBefore)
    : metadata.emptyValue;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <PortalStatisticsCard
          icon={<InboxIcon aria-hidden="true" className="size-4" />}
          value={responseCount}
          title={workspace.submissionsTitle}
          description={org.list.submissions(responseCount)}
        />
        <PortalStatisticsCard
          icon={<ClipboardListIcon aria-hidden="true" className="size-4" />}
          value={questionCount}
          title={workspace.questionsTitle}
          description={workspace.questionsDescription(questionCount)}
        />
        <PortalStatisticsCard
          icon={<CalendarClockIcon aria-hidden="true" className="size-4" />}
          value={deadlineLabel}
          title={workspace.deadlineTitle}
          description={metadata.submitBefore}
          trendVariant="neutral"
        />
      </div>

      <SurveyDetailTabs
        labels={labels}
        manage={manage}
        share={share}
        submissions={submissions}
      />
    </div>
  );
}
