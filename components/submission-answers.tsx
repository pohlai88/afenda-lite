import {
  formatAnswerForDisplay,
  type EvidenceRecord,
  type SurveyQuestion,
} from "@/lib/question-models";
import type { SurveyResponse } from "@/lib/domain/surveys";
import { QuestionSequenceBadge } from "@/components/question-sequence-badge";

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
    <dl className="min-w-0 space-y-2 text-sm">
      {rows.map((row, index) => (
        <div key={row.id} className="min-w-0">
          <dt className="flex min-w-0 items-start gap-2 font-medium">
            <QuestionSequenceBadge number={index + 1} className="mt-0.5 shrink-0" />
            <span className="min-w-0 break-words">{row.prompt}</span>
          </dt>
          <dd className="mt-1 min-w-0 break-words pl-9 text-muted-foreground">
            {row.display}
          </dd>
        </div>
      ))}
    </dl>
  );
}
