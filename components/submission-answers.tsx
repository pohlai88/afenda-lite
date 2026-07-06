import { formatAnswerForDisplay } from "@/lib/questions";
import type { SurveyQuestion } from "@/lib/questions";
import type { SurveyResponse } from "@/lib/surveys";
import { portalCopy } from "@/lib/portal-copy";
import { getEvidenceRecord } from "@/lib/questions";

export async function SubmissionAnswers({
  response,
  questions,
  surveyId,
}: {
  response: SurveyResponse;
  questions: SurveyQuestion[];
  surveyId: string;
}) {
  const { submissions } = portalCopy.declarationDetail;

  if (response.answers && questions.length > 0) {
    const rows = await Promise.all(
      questions.map(async (question) => {
        const value = response.answers?.[question.id];
        let evidenceName: string | undefined;
        if (question.type === "file" && typeof value === "string") {
          const evidence = await getEvidenceRecord(value, surveyId);
          evidenceName = evidence?.fileName;
        }
        return {
          id: question.id,
          prompt: question.prompt,
          display: formatAnswerForDisplay(question, value, evidenceName),
        };
      }),
    );

    return (
      <dl className="space-y-2 text-sm">
        {rows.map((row) => (
          <div key={row.id}>
            <dt className="font-medium">{row.prompt}</dt>
            <dd className="text-muted-foreground">{row.display}</dd>
          </div>
        ))}
      </dl>
    );
  }

  if (response.rating != null) {
    return (
      <p className="text-sm text-muted-foreground">
        {submissions.rating(response.rating)}
        {response.comment ? ` — ${response.comment}` : ""}
      </p>
    );
  }

  return null;
}
