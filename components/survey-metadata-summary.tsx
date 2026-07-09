import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { formatDate } from "@/lib/format";
import { portalCopy } from "@/lib/copy/portal-copy";
import type { Survey } from "@/lib/domain/surveys";

function DetailItem({
  label,
  value,
  monospace = false,
}: {
  label: string;
  value: string | null | undefined;
  monospace?: boolean;
}) {
  const { metadata } = portalCopy.declarationDetail;
  const display = value?.trim() ? value : metadata.emptyValue;

  return (
    <div className="space-y-1">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd
        className={
          monospace
            ? "break-all font-mono text-xs font-medium"
            : "min-w-0 break-words text-sm font-medium"
        }
      >
        {display}
      </dd>
    </div>
  );
}

export function SurveyMetadataSummary({ survey }: { survey: Survey }) {
  const { metadata } = portalCopy.declarationDetail;

  const hasUserMetadata =
    survey.referenceNumber ||
    survey.caseNumber ||
    survey.effectiveDate ||
    survey.submitBefore ||
    survey.surveyorName ||
    survey.surveyorOrg ||
    survey.surveyeeIndividual ||
    survey.surveyeeOrg ||
    survey.purpose ||
    survey.categories.length > 0;

  return (
    <Card className="min-w-0">
      <CardHeader className="pb-3">
        <h2 className="portal-card-title">{metadata.title}</h2>
        <CardDescription>{metadata.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <DetailItem
            label={metadata.declarationId}
            value={survey.id}
            monospace
          />
          {hasUserMetadata ? (
            <>
              <DetailItem
                label={metadata.referenceNumber}
                value={survey.referenceNumber}
              />
              <DetailItem label={metadata.caseNumber} value={survey.caseNumber} />
              <DetailItem
                label={metadata.effectiveDate}
                value={
                  survey.effectiveDate ? formatDate(survey.effectiveDate) : null
                }
              />
              <DetailItem
                label={metadata.submitBefore}
                value={
                  survey.submitBefore ? formatDate(survey.submitBefore) : null
                }
              />
              <DetailItem
                label={metadata.surveyorName}
                value={survey.surveyorName}
              />
              <DetailItem label={metadata.surveyorOrg} value={survey.surveyorOrg} />
              <DetailItem
                label={metadata.surveyeeIndividual}
                value={survey.surveyeeIndividual}
              />
              <DetailItem
                label={metadata.surveyeeOrg}
                value={survey.surveyeeOrg}
              />
            </>
          ) : null}
        </dl>
        {survey.purpose ? (
          <div className="mt-4 space-y-1">
            <p className="text-xs text-muted-foreground">{metadata.purpose}</p>
            <p className="text-sm">{survey.purpose}</p>
          </div>
        ) : null}
        {survey.categories.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {survey.categories.map((category) => (
              <Badge key={category} variant="surface">
                {category}
              </Badge>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
