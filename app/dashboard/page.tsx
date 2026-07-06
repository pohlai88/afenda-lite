import Link from "next/link";
import { redirect } from "next/navigation";
import {
  BarChart3Icon,
  ClipboardListIcon,
  MessageSquareQuoteIcon,
} from "lucide-react";
import { AnonymousSharePanel } from "@/components/anonymous-share-panel";
import { DeclarationCreateForm } from "@/components/declaration-create-form";
import { PortalSection, PortalShell } from "@/components/portal-shell";
import { PortalStatCard } from "@/components/portal-stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { isAdminSession } from "@/lib/admin";
import { auth } from "@/lib/auth/server";
import { portalCopy } from "@/lib/portal-copy";
import { listSurveysForAdmin } from "@/lib/surveys";

export default async function DashboardPage() {
  const { account } = portalCopy;
  const { data: session } = await auth.getSession();

  if (!isAdminSession(session)) {
    redirect("/?reason=access-denied");
  }

  const surveys = await listSurveysForAdmin();
  const totalResponses = surveys.reduce(
    (sum, survey) => sum + survey.responseCount,
    0,
  );
  const ratedSurveys = surveys.filter((survey) => survey.averageRating);
  const overallAverage =
    ratedSurveys.length > 0
      ? (
          ratedSurveys.reduce(
            (sum, survey) => sum + Number(survey.averageRating),
            0,
          ) / ratedSurveys.length
        ).toFixed(1)
      : "—";

  return (
    <PortalShell
      eyebrow={account.eyebrow}
      title={account.title}
      description={account.description}
      headerActions={
        <Button
          variant="outline"
          size="sm"
          render={<Link href="/dashboard/clients" />}
          nativeButton={false}
        >
          {account.list.inviteClients}
        </Button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <PortalStatCard
          icon={<ClipboardListIcon className="size-4" />}
          value={String(surveys.length)}
          title={account.stats.declarations.title}
          detail={account.stats.declarations.detail}
        />
        <PortalStatCard
          icon={<MessageSquareQuoteIcon className="size-4" />}
          value={String(totalResponses)}
          title={account.stats.submissions.title}
          detail={account.stats.submissions.detail}
        />
        <PortalStatCard
          icon={<BarChart3Icon className="size-4" />}
          value={overallAverage === "—" ? "—" : `${overallAverage}/5`}
          title={account.stats.average.title}
          detail={account.stats.average.detail}
        />
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(280px,320px)_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>{account.create.title}</CardTitle>
            <CardDescription>{account.create.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <DeclarationCreateForm />
          </CardContent>
        </Card>

        <PortalSection
          title={account.list.title}
          description={account.list.description}
        >
          {surveys.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                {account.list.empty}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {surveys.map((survey) => (
                <Card key={survey.id}>
                  <CardHeader className="flex flex-row items-start justify-between gap-4">
                    <div className="min-w-0 space-y-1">
                      <CardTitle className="truncate">{survey.title}</CardTitle>
                      <CardDescription className="line-clamp-2">
                        {survey.question}
                      </CardDescription>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <Badge variant="secondary">
                        {account.list.submissions(survey.responseCount)}
                      </Badge>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        Avg{" "}
                        {survey.averageRating
                          ? `${survey.averageRating}/5`
                          : "—"}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-0">
                    <Button
                      variant="outline"
                      size="sm"
                      render={<Link href={`/dashboard/${survey.id}`} />}
                      nativeButton={false}
                    >
                      {account.list.viewSubmissions}
                    </Button>
                    <AnonymousSharePanel
                      surveyId={survey.id}
                      publicPath={`/survey/${survey.slug}`}
                      embedded
                    />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </PortalSection>
      </div>
    </PortalShell>
  );
}
