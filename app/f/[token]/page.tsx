import { PortalCustomerShell } from "@/components/portal-customer-shell";
import { SurveyForm } from "@/components/survey-form";
import { DeclarationQuestionsEmpty } from "@/components/declaration-questions-empty";
import { listQuestionsForSurvey } from "@/lib/questions";
import { portalCopy } from "@/lib/portal-copy";
import { getSurveyByInviteToken } from "@/lib/surveys";
import { notFound } from "next/navigation";

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

  const questions = await listQuestionsForSurvey(survey.id);
  const { declarationPage, product } = portalCopy;

  if (questions.length === 0) {
    return (
      <DeclarationQuestionsEmpty
        eyebrow={product.secureAccessEyebrow}
        title={declarationPage.secureTitle}
        description={declarationPage.secureDescription}
      />
    );
  }

  return (
    <PortalCustomerShell
      eyebrow={product.secureAccessEyebrow}
      title={declarationPage.secureTitle}
      description={declarationPage.secureDescription}
    >
      <SurveyForm
        surveyId={survey.id}
        slug={survey.slug}
        title={survey.title}
        description={survey.question}
        questions={questions}
        anonymous
      />
    </PortalCustomerShell>
  );
}
