import { notFound } from "next/navigation";
import { SurveyForm } from "@/components/survey-form";
import { getSurveyByInviteToken } from "@/lib/surveys";

export default async function AnonymousSurveyPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const survey = await getSurveyByInviteToken(token);

  if (!survey) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-background px-6 py-16 text-foreground">
      <div className="mx-auto max-w-xl">
        <p className="text-sm text-muted-foreground">Anonymous feedback</p>
        <h1 className="mt-1 text-3xl font-semibold">Share your experience</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Your response is anonymous. We do not collect your name, email, phone
          number, or IP address.
        </p>
        <div className="mt-8">
          <SurveyForm
            slug={survey.slug}
            question={survey.question}
            anonymous
          />
        </div>
      </div>
    </main>
  );
}
