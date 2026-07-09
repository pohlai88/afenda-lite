import { describe, expect, it } from "vitest";
import type { SurveyQuestion } from "@/lib/domain/questions";
import type { SurveyResponse } from "@/lib/domain/surveys";
import {
  collectSubmissionFileEvidenceIds,
  mapOperatorDeclarationQuestionDrafts,
} from "@/lib/pages/operator-declaration-detail.logic";

const fileQuestion: SurveyQuestion = {
  id: "550e8400-e29b-41d4-a716-446655440001",
  surveyId: "550e8400-e29b-41d4-a716-446655440002",
  prompt: "Upload passport",
  type: "file",
  required: true,
  sortOrder: 0,
  config: {},
};

const yesNoQuestion: SurveyQuestion = {
  ...fileQuestion,
  id: "550e8400-e29b-41d4-a716-446655440003",
  prompt: "Confirm",
  type: "yes_no",
};

const baseResponse: SurveyResponse = {
  id: "550e8400-e29b-41d4-a716-446655440004",
  surveyId: fileQuestion.surveyId,
  answers: {},
  confirmationCode: "CDP-123",
  createdAt: new Date("2026-07-01T00:00:00.000Z"),
};

describe("collectSubmissionFileEvidenceIds", () => {
  it("collects file evidence ids from matching answers only", () => {
    expect(
      collectSubmissionFileEvidenceIds(
        [
          {
            ...baseResponse,
            answers: {
              [fileQuestion.id]: "evidence-1",
              [yesNoQuestion.id]: true,
            },
          },
        ],
        [fileQuestion, yesNoQuestion],
      ),
    ).toEqual(["evidence-1"]);
  });

  it("returns an empty list when no file answers exist", () => {
    expect(
      collectSubmissionFileEvidenceIds(
        [{ ...baseResponse, answers: { [yesNoQuestion.id]: true } }],
        [yesNoQuestion],
      ),
    ).toEqual([]);
  });
});

describe("mapOperatorDeclarationQuestionDrafts", () => {
  it("maps survey questions into manage-form drafts", () => {
    expect(
      mapOperatorDeclarationQuestionDrafts([fileQuestion, yesNoQuestion]),
    ).toEqual([
      {
        prompt: "Upload passport",
        type: "file",
        required: true,
        config: {},
      },
      {
        prompt: "Confirm",
        type: "yes_no",
        required: true,
        config: {},
      },
    ]);
  });
});
