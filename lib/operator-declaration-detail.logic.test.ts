import { describe, expect, it } from "vitest";
import type { SurveyQuestion } from "@/lib/questions";
import type { SurveyResponse } from "@/lib/surveys";
import {
  collectSubmissionFileEvidenceIds,
  mapOperatorDeclarationQuestionDrafts,
} from "@/lib/operator-declaration-detail.logic";

const fileQuestion: SurveyQuestion = {
  id: "550e8400-e29b-41d4-a716-446655440001",
  surveyId: "550e8400-e29b-41d4-a716-446655440002",
  prompt: "Upload passport",
  type: "file",
  required: true,
  sortOrder: 0,
  config: {},
};

const booleanQuestion: SurveyQuestion = {
  ...fileQuestion,
  id: "550e8400-e29b-41d4-a716-446655440003",
  prompt: "Confirm",
  type: "boolean",
};

const   baseResponse: SurveyResponse = {
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
              [booleanQuestion.id]: true,
            },
          },
        ],
        [fileQuestion, booleanQuestion],
      ),
    ).toEqual(["evidence-1"]);
  });

  it("returns an empty list when no file answers exist", () => {
    expect(
      collectSubmissionFileEvidenceIds(
        [{ ...baseResponse, answers: { [booleanQuestion.id]: true } }],
        [booleanQuestion],
      ),
    ).toEqual([]);
  });
});

describe("mapOperatorDeclarationQuestionDrafts", () => {
  it("maps survey questions into manage-form drafts", () => {
    expect(
      mapOperatorDeclarationQuestionDrafts([fileQuestion, booleanQuestion]),
    ).toEqual([
      {
        prompt: "Upload passport",
        type: "file",
        required: true,
        config: {},
      },
      {
        prompt: "Confirm",
        type: "boolean",
        required: true,
        config: {},
      },
    ]);
  });
});
