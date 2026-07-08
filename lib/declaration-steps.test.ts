import { describe, expect, it } from "vitest";
import {
  buildEvidenceNamesFromDraft,
  clampDraftStepIndex,
  countAnsweredQuestions,
} from "@/lib/declaration-steps";
import type { SurveyQuestion } from "@/lib/question-models";

const questions: SurveyQuestion[] = [
  {
    id: "q1",
    surveyId: "s1",
    prompt: "Yes or no?",
    type: "yes_no",
    required: true,
    sortOrder: 0,
    config: {},
  },
  {
    id: "q2",
    surveyId: "s1",
    prompt: "Upload",
    type: "file",
    required: true,
    sortOrder: 1,
    config: {},
  },
];

describe("declaration draft helpers", () => {
  it("clamps step index to wizard bounds", () => {
    expect(clampDraftStepIndex(-1, 5)).toBe(0);
    expect(clampDraftStepIndex(3, 5)).toBe(3);
    expect(clampDraftStepIndex(99, 5)).toBe(4);
  });

  it("counts answered questions", () => {
    expect(
      countAnsweredQuestions(questions, {
        q1: true,
        q2: "",
      }),
    ).toBe(1);
  });

  it("maps file evidence ids to filenames", () => {
    const names = buildEvidenceNamesFromDraft(
      questions,
      { q2: "evidence-1" },
      new Map([["evidence-1", { fileName: "policy.pdf" }]]),
    );

    expect(names).toEqual({ q2: "policy.pdf" });
  });
});
