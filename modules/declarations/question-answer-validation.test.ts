import { describe, expect, it } from "vitest";
import {
  textAnswerRequirementsHint,
  validateQuestionAnswer,
} from "@/modules/declarations/question-answer-validation";
import type { SurveyQuestion } from "@/modules/declarations/question-models";

const copy = {
  requiredFieldError: "Required",
  fileRequired: "Select PDF",
  yesNoRequired: "Select Yes or No",
  textTooShort: (min: number) => `Min ${min}`,
  textTooLong: (max: number) => `Max ${max}`,
};

function textQuestion(overrides: Partial<SurveyQuestion> = {}): SurveyQuestion {
  return {
    id: "q1",
    surveyId: "s1",
    prompt: "Explain",
    type: "text",
    required: true,
    sortOrder: 1,
    config: {},
    ...overrides,
  };
}

describe("validateQuestionAnswer", () => {
  it("requires yes/no selection", () => {
    expect(
      validateQuestionAnswer(
        { ...textQuestion(), type: "yes_no", required: true },
        undefined,
        copy,
      ),
    ).toBe("Select Yes or No");
  });

  it("enforces configured text bounds", () => {
    const question = textQuestion({
      config: { minLength: 10, maxLength: 20 },
    });
    expect(validateQuestionAnswer(question, "short", copy)).toBe("Min 10");
    expect(validateQuestionAnswer(question, "a".repeat(21), copy)).toBe("Max 20");
    expect(validateQuestionAnswer(question, "valid length", copy)).toBeNull();
  });
});

describe("textAnswerRequirementsHint", () => {
  it("shows configured min and max", () => {
    expect(
      textAnswerRequirementsHint(
        textQuestion({ config: { minLength: 10, maxLength: 500 } }),
      ),
    ).toBe("10–500 characters.");
  });
});
