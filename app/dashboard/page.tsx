import Link from "next/link";
import { redirect } from "next/navigation";
import { createSurveyAction } from "@/app/actions/surveys";
import { UserButton } from "@/components/user-button";
import { CopyLinkButton } from "@/components/copy-link-button";
import { AnonymousSharePanel } from "@/components/anonymous-share-panel";
import { isAdminSession } from "@/lib/admin";
import { auth } from "@/lib/auth/server";
import { listSurveysForAdmin } from "@/lib/surveys";

export default async function DashboardPage() {
  const { data: session } = await auth.getSession();

  if (!isAdminSession(session)) {
    redirect("/");
  }

  const surveys = await listSurveysForAdmin();

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-6">
        <div>
          <p className="text-sm text-muted-foreground">Operator admin</p>
          <h1 className="text-2xl font-semibold">Survey dashboard</h1>
        </div>
        <UserButton />
      </header>

      <div className="mx-auto grid max-w-5xl gap-8 px-6 py-8 lg:grid-cols-[320px_1fr]">
        <section className="rounded-2xl border border-border bg-card p-6">
          <h2 className="text-lg font-medium">New survey</h2>
          <form action={createSurveyAction} className="mt-4 space-y-4">
            <label className="block text-sm font-medium">
              Survey title
              <input
                name="title"
                required
                className="mt-2 w-full rounded-xl border border-input bg-background px-3 py-2"
                placeholder="Q2 customer satisfaction"
              />
            </label>
            <label className="block text-sm font-medium">
              Question for customers
              <textarea
                name="question"
                required
                className="mt-2 min-h-28 w-full rounded-xl border border-input bg-background px-3 py-2"
                placeholder="How satisfied are you with our service?"
              />
            </label>
            <button
              type="submit"
              className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground"
            >
              Create survey
            </button>
          </form>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-medium">Your surveys</h2>

          {surveys.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-8 text-sm text-muted-foreground">
              No surveys yet. Create your first one to get a customer link.
            </div>
          ) : (
            surveys.map((survey) => {
              const publicUrl = `/survey/${survey.slug}`;

              return (
                <article
                  key={survey.id}
                  className="rounded-2xl border border-border bg-card p-6"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-medium">{survey.title}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {survey.question}
                      </p>
                    </div>
                    <div className="text-right text-sm">
                      <p>
                        <span className="font-medium">
                          {survey.responseCount}
                        </span>{" "}
                        responses
                      </p>
                      <p className="text-muted-foreground">
                        Avg:{" "}
                        {survey.averageRating
                          ? `${survey.averageRating}/5`
                          : "—"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-3">
                    <CopyLinkButton url={publicUrl} />
                    <Link
                      href={`/dashboard/${survey.id}`}
                      className="rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-accent"
                    >
                      View responses
                    </Link>
                  </div>

                  <AnonymousSharePanel surveyId={survey.id} />
                </article>
              );
            })
          )}
        </section>
      </div>
    </main>
  );
}
