import { PortalCustomerShell } from "@/components/portal-customer-shell";
import { SurveyForm } from "@/components/survey-form";
import { ensureDefaultQuestions } from "@/lib/questions";
import { portalCopy } from "@/lib/portal-copy";
import { getSurveyBySlug } from "@/lib/surveys";
import { notFound } from "next/navigation";

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

  const questions = await ensureDefaultQuestions(survey.id, survey.question);
  const { product, declarationPage } = portalCopy;

  return (
    <PortalCustomerShell
      eyebrow={product.declarationEyebrow}
      title={survey.title}
      description={declarationPage.publicDescription}
    >
      <SurveyForm
        surveyId={survey.id}
        slug={survey.slug}
        title={survey.title}
        description={survey.question}
        questions={questions}
      />
    </PortalCustomerShell>
  );
}
