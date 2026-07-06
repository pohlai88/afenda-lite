import { notFound } from "next/navigation";
import { SurveyForm } from "@/components/survey-form";
import { getSurveyBySlug } from "@/lib/surveys";

export default async function PublicSurveyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const survey = await getSurveyBySlug(slug);

  if (!survey) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-background px-6 py-16 text-foreground">
      <div className="mx-auto max-w-xl">
        <p className="text-sm text-muted-foreground">Customer feedback</p>
        <h1 className="mt-1 text-3xl font-semibold">{survey.title}</h1>
        <div className="mt-8">
          <SurveyForm slug={survey.slug} question={survey.question} />
        </div>
      </div>
    </main>
  );
}
