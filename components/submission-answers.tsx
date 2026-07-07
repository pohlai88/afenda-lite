import {
  formatAnswerForDisplay,
  type EvidenceRecord,
  type SurveyQuestion,
} from "@/lib/questions";
import type { SurveyResponse } from "@/lib/surveys";
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
    <dl className="space-y-2 text-sm">
      {rows.map((row, index) => (
        <div key={row.id}>
          <dt className="flex items-start gap-2 font-medium">
            <QuestionSequenceBadge number={index + 1} className="mt-0.5" />
            <span>{row.prompt}</span>
          </dt>
          <dd className="mt-1 pl-9 text-muted-foreground">{row.display}</dd>
        </div>
      ))}
    </dl>
  );
}
