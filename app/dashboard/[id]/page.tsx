import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { UserButton } from "@/components/user-button";
import { CopyLinkButton } from "@/components/copy-link-button";
import { AnonymousSharePanel } from "@/components/anonymous-share-panel";
import { isAdminSession } from "@/lib/admin";
import { auth } from "@/lib/auth/server";
import {
  getSurveyForAdmin,
  listResponsesForSurvey,
} from "@/lib/surveys";

export default async function SurveyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { data: session } = await auth.getSession();

  if (!isAdminSession(session)) {
    redirect("/");
  }

  const survey = await getSurveyForAdmin(id);
  if (!survey) {
    notFound();
  }

  const responses = await listResponsesForSurvey(survey.id);
  const average =
    responses.length > 0
      ? (
          responses.reduce((sum, item) => sum + item.rating, 0) /
          responses.length
        ).toFixed(1)
      : null;

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-6">
        <div>
          <Link
            href="/dashboard"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Back to dashboard
          </Link>
          <h1 className="mt-1 text-2xl font-semibold">{survey.title}</h1>
        </div>
        <UserButton />
      </header>

      <div className="mx-auto max-w-5xl space-y-6 px-6 py-8">
        <section className="rounded-2xl border border-border bg-card p-6">
          <p className="text-muted-foreground">{survey.question}</p>
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <CopyLinkButton url={`/survey/${survey.slug}`} />
            <p className="text-sm text-muted-foreground">
              {responses.length} responses · Avg {average ? `${average}/5` : "—"}
            </p>
          </div>
          <AnonymousSharePanel surveyId={survey.id} />
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-medium">Responses</h2>

          {responses.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-8 text-sm text-muted-foreground">
              No responses yet. Share the anonymous link or QR code with clients.
            </div>
          ) : (
            responses.map((response) => (
              <article
                key={response.id}
                className="rounded-2xl border border-border bg-card p-5"
              >
                <div className="flex items-center justify-between gap-4">
                  <p className="font-medium">Rating: {response.rating}/5</p>
                  <p className="text-sm text-muted-foreground">
                    {response.createdAt.toLocaleString()}
                  </p>
                </div>
                {response.comment ? (
                  <p className="mt-3 text-sm text-muted-foreground">
                    {response.comment}
                  </p>
                ) : null}
              </article>
            ))
          )}
        </section>
      </div>
    </main>
  );
}
