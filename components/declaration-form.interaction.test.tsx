import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { portalCopy } from "@/lib/copy/portal-copy";
import type { SurveyQuestion } from "@/lib/question-models";
import { renderPortal, setupUser } from "@/testing/react";

vi.mock("@/app/actions/declarations", () => ({
  registerEvidenceAction: vi.fn(async () => ({
    evidenceId: "550e8400-e29b-41d4-a716-446655440099",
    fileName: "sample.pdf",
  })),
}));

import { DeclarationForm } from "@/components/declaration-form";

const assignmentId = "550e8400-e29b-41d4-a716-446655440001";
const questionId = "550e8400-e29b-41d4-a716-446655440002";
const surveyId = "550e8400-e29b-41d4-a716-446655440003";

const sampleQuestions: SurveyQuestion[] = [
  {
    id: questionId,
    surveyId,
    prompt: "Confirm eligibility?",
    type: "yes_no",
    required: true,
    sortOrder: 0,
    config: {},
  },
];

function renderDeclarationForm(
  onSaveDraft = vi.fn(async () => ({
    savedAt: "2026-07-08T12:00:00.000Z",
  })),
) {
  const onSubmit = vi.fn(async () => ({ success: true, confirmationCode: "CDP-TEST" }));

  const view = renderPortal(
    <DeclarationForm
      surveyId={surveyId}
      slug="sample-declaration"
      title="Sample declaration"
      questions={sampleQuestions}
      assignmentId={assignmentId}
      onSaveDraft={onSaveDraft}
      onSubmit={onSubmit}
    />,
  );

  return { ...view, onSaveDraft, onSubmit };
}

describe("DeclarationForm draft save", () => {
  beforeEach(() => {
    vi.useRealTimers();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        json: async () => ({ savedAt: "2026-07-08T12:00:00.000Z" }),
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
    vi.clearAllTimers();
  });

  it("saves immediately when Save progress is clicked", async () => {
    const user = setupUser();
    const onSaveDraft = vi.fn(async () => ({
      savedAt: "2026-07-08T12:00:00.000Z",
    }));

    renderDeclarationForm(onSaveDraft);

    await user.click(screen.getByRole("radio", { name: /^yes$/i }));
    await user.click(
      screen.getByRole("button", {
        name: portalCopy.declarationForm.wizard.saveProgress,
      }),
    );

    await waitFor(() => {
      expect(onSaveDraft).toHaveBeenCalledOnce();
    });
    await waitFor(() => {
      expect(screen.getByText(/progress saved/i)).toBeInTheDocument();
    });
  });
});

describe("DeclarationForm draft autosave timing", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        json: async () => ({ savedAt: "2026-07-08T12:00:00.000Z" }),
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
    vi.clearAllTimers();
  });

  it("debounces autosave until answers stop changing for 1.2s", async () => {
    const onSaveDraft = vi.fn(async () => ({
      savedAt: "2026-07-08T12:00:00.000Z",
    }));

    renderDeclarationForm(onSaveDraft);

    fireEvent.click(screen.getByRole("radio", { name: /^yes$/i }));
    expect(onSaveDraft).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1199);
    });
    expect(onSaveDraft).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });

    expect(onSaveDraft).toHaveBeenCalledOnce();
    expect(onSaveDraft).toHaveBeenCalledWith({
      assignmentId,
      answers: { [questionId]: true },
      stepIndex: 0,
    });
  });

  it("flushes keepalive draft save on unmount before debounce fires", async () => {
    const fetchMock = vi.mocked(global.fetch);
    const onSaveDraft = vi.fn(async () => ({
      savedAt: "2026-07-08T12:00:00.000Z",
    }));

    const { unmount } = renderDeclarationForm(onSaveDraft);

    fireEvent.click(screen.getByRole("radio", { name: /^yes$/i }));
    expect(onSaveDraft).not.toHaveBeenCalled();

    unmount();

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/client/declaration-draft",
      expect.objectContaining({
        method: "POST",
        keepalive: true,
        body: JSON.stringify({
          assignmentId,
          answers: { [questionId]: true },
          stepIndex: 0,
        }),
      }),
    );
  });
});
