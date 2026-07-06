import {
  formatAnswerForDisplay,
  type EvidenceRecord,
  type SurveyQuestion,
} from "@/lib/questions";
import type { SurveyResponse } from "@/lib/surveys";
import { portalCopy } from "@/lib/portal-copy";

export function SubmissionAnswers({
  response,
  questions,
  evidenceById = new Map<string, EvidenceRecord>(),
}: {
  response: SurveyResponse;
  questions: SurveyQuestion[];
  evidenceById?: Map<string, EvidenceRecord>;
}) {
  if (!response.answers || questions.length === 0) {
    return null;
  }

  const rows = questions.map((question) => {
    const value = response.answers?.[question.id];
    let evidenceName: string | undefined;
    if (question.type === "file" && typeof value === "string") {
      evidenceName = evidenceById.get(value)?.fileName;
    }
    return {
      id: question.id,
      prompt: question.prompt,
      display: formatAnswerForDisplay(question, value, evidenceName),
    };
  });

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
