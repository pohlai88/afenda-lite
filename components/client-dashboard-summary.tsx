import {
  ClipboardCheckIcon,
  ClipboardListIcon,
  ClockIcon,
  type LucideIcon,
} from "lucide-react";
import { PortalStatisticsCard } from "@/components/portal-statistics-card";
import type { ClientProfile } from "@/lib/clients";
import type { ClientDashboardMetrics } from "@/lib/client-dashboard-metrics";
import { portalCopy } from "@/lib/portal-copy";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function DeclarantField({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  if (!value) return null;

  return (
    <div className="rounded-lg border bg-muted/30 px-4 py-3">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm font-medium text-foreground">{value}</dd>
    </div>
  );
}

const metricIcons: Record<"pending" | "submitted" | "dueSoon", LucideIcon> = {
  pending: ClipboardListIcon,
  submitted: ClipboardCheckIcon,
  dueSoon: ClockIcon,
};

export function ClientDashboardSummary({
  profile,
  metrics,
}: {
  profile: ClientProfile | null;
  metrics: ClientDashboardMetrics;
}) {
  const copy = portalCopy.clientDashboard;
  const metricItems = [
    {
      key: "pending" as const,
      title: copy.metrics.pending,
      value: metrics.pending,
      description: copy.metrics.pendingDescription,
    },
    {
      key: "submitted" as const,
      title: copy.metrics.submitted,
      value: metrics.submitted,
      description: copy.metrics.submittedDescription,
    },
    {
      key: "dueSoon" as const,
      title: copy.metrics.dueSoon,
      value: metrics.dueSoon,
      description: copy.metrics.dueSoonDescription,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {metricItems.map((metric) => {
          const Icon = metricIcons[metric.key];
          return (
            <PortalStatisticsCard
              key={metric.key}
              icon={<Icon aria-hidden="true" className="size-4" />}
              value={metric.value}
              title={metric.title}
              description={metric.description}
            />
          );
        })}
      </div>

      {profile ? (
        <Card>
          <CardHeader className="gap-1">
            <CardTitle className="text-lg">{copy.declarantSummaryTitle}</CardTitle>
            <CardDescription className="text-pretty">
              {copy.declarantSummaryDescription}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-3 sm:grid-cols-2">
              <DeclarantField
                label={copy.declarantFullNameLabel}
                value={profile.fullLegalName}
              />
              <DeclarantField
                label={copy.declarantEntityLabel}
                value={profile.entityName}
              />
              <DeclarantField
                label={copy.declarantJurisdictionLabel}
                value={profile.jurisdiction}
              />
            </dl>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
