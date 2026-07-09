import { describe, expect, it } from "vitest";
import { parseSchema } from "@/lib/schemas/common";
import {
  issueClientInviteSchema,
  saveClientDeclarationDraftSchema,
  submitClientDeclarationSchema,
} from "@/lib/schemas/client";
import { registerEvidenceSchema } from "@/lib/schemas/declarations";
import { cdpQuestionSchema, questionDraftSchema } from "@/lib/schemas/questions";
import {
  openSurveySlugParamSchema,
  submitSurveyResponseSchema,
  surveyInviteTokenParamSchema,
} from "@/lib/schemas/surveys";

const assignmentId = "550e8400-e29b-41d4-a716-446655440001";
const surveyId = "550e8400-e29b-41d4-a716-446655440002";
const questionId = "550e8400-e29b-41d4-a716-446655440003";

describe("lib/schemas contracts", () => {
  it("rejects invalid UUIDs without accepting partial payloads", () => {
    expect(
      parseSchema(saveClientDeclarationDraftSchema, {
        assignmentId: "bad",
        answers: {},
        stepIndex: 0,
      }).success,
    ).toBe(false);
    expect(
      parseSchema(submitClientDeclarationSchema, {
        assignmentId,
        slug: "",
        answers: {},
      }).success,
    ).toBe(false);
  });

  it("accepts valid client draft and submit payloads", () => {
    expect(
      parseSchema(saveClientDeclarationDraftSchema, {
        assignmentId,
        answers: { [questionId]: "answer text" },
        stepIndex: 1,
      }),
    ).toEqual({
      success: true,
      data: {
        assignmentId,
        answers: { [questionId]: "answer text" },
        stepIndex: 1,
      },
    });

    expect(
      parseSchema(submitSurveyResponseSchema, {
        slug: "demo-declaration",
        answers: { [questionId]: true },
      }).success,
    ).toBe(true);
  });

  it("rejects unknown question types in editor and package schemas", () => {
    const invalid = {
      prompt: "Q?",
      type: "rating",
      required: true,
    };
    expect(parseSchema(questionDraftSchema, invalid).success).toBe(false);
    expect(parseSchema(cdpQuestionSchema, invalid).success).toBe(false);
  });

  it("validates public link param schemas", () => {
    expect(parseSchema(openSurveySlugParamSchema, "  demo-slug  ").success).toBe(
      true,
    );
    expect(parseSchema(openSurveySlugParamSchema, "").success).toBe(false);
    expect(parseSchema(surveyInviteTokenParamSchema, "tok-abc").success).toBe(
      true,
    );
  });

  it("rejects evidence that fails policy superRefine", () => {
    const result = parseSchema(registerEvidenceSchema, {
      surveyId,
      slug: "demo",
      questionId,
      fileName: "evil.exe",
      mimeType: "application/x-msdownload",
      sizeBytes: 1024,
    });
    expect(result.success).toBe(false);
  });

  it("validates client invite email and full name limits", () => {
    expect(
      parseSchema(issueClientInviteSchema, {
        email: "not-an-email",
        fullName: "Ada Lovelace",
        surveyId,
      }).success,
    ).toBe(false);
    expect(
      parseSchema(issueClientInviteSchema, {
        email: "ada@example.com",
        fullName: "Ada Lovelace",
        surveyId,
      }).success,
    ).toBe(true);
  });
});
