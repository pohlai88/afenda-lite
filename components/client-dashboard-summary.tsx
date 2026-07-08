import {
  ClipboardCheckIcon,
  ClipboardListIcon,
  ClockIcon,
  type LucideIcon,
} from "lucide-react";
import { PortalStatisticsCard } from "@/components/portal-statistics-card";
import {
  PortalProfileField,
  PortalProfileFieldGroup,
} from "@/components/portal-profile-field";
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

const metricIcons: Record<
  "pending" | "inProgress" | "submitted" | "dueSoon",
  LucideIcon
> = {
  pending: ClipboardListIcon,
  inProgress: ClockIcon,
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
      trendLabel: metrics.trends.pending.label,
      trendVariant: metrics.trends.pending.variant,
    },
    {
      key: "inProgress" as const,
      title: copy.metrics.inProgress,
      value: metrics.inProgress,
      description: copy.metrics.inProgressDescription,
      trendLabel: metrics.trends.inProgress.label,
      trendVariant: metrics.trends.inProgress.variant,
    },
    {
      key: "submitted" as const,
      title: copy.metrics.submitted,
      value: metrics.submitted,
      description: copy.metrics.submittedDescription,
      trendLabel: metrics.trends.submitted.label,
      trendVariant: metrics.trends.submitted.variant,
    },
    {
      key: "dueSoon" as const,
      title: copy.metrics.dueSoon,
      value: metrics.dueSoon,
      description: copy.metrics.dueSoonDescription,
      trendLabel: metrics.trends.dueSoon.label,
      trendVariant: metrics.trends.dueSoon.variant,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metricItems.map((metric) => {
          const Icon = metricIcons[metric.key];
          return (
            <PortalStatisticsCard
              key={metric.key}
              icon={<Icon aria-hidden="true" className="size-4" />}
              value={metric.value}
              title={metric.title}
              description={metric.description}
              trendLabel={metric.trendLabel}
              trendVariant={metric.trendVariant}
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
            <PortalProfileFieldGroup className="gap-4">
              <PortalProfileField
                label={copy.declarantFullNameLabel}
                value={profile.fullLegalName}
              />
              <PortalProfileField
                label={copy.declarantEntityLabel}
                value={profile.entityName}
              />
              <PortalProfileField
                label={copy.declarantJurisdictionLabel}
                value={profile.jurisdiction}
              />
            </PortalProfileFieldGroup>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
