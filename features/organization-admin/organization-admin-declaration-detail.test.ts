import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock(
  "@/components-V2/platform-views/portal-views/organization-admin-declaration-detail",
  () => ({
    default: () => null,
  }),
);

const mockGetSurveyForAdmin = vi.fn();
const mockListResponsesForSurvey = vi.fn();
const mockListQuestionsForSurvey = vi.fn();
const mockGetEvidenceRecordsByIds = vi.fn();
const mockNotFound = vi.fn(() => {
  throw new Error("NOT_FOUND");
});

vi.mock("next/navigation", () => ({
  notFound: () => mockNotFound(),
}));

vi.mock("@/modules/declarations/domain/surveys", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/modules/declarations/domain/surveys")>();
  return {
    ...actual,
    getSurveyForAdmin: (...args: unknown[]) => mockGetSurveyForAdmin(...args),
    listResponsesForSurvey: (...args: unknown[]) =>
      mockListResponsesForSurvey(...args),
  };
});

vi.mock("@/modules/declarations/domain/questions", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/modules/declarations/domain/questions")>();
  return {
    ...actual,
    listQuestionsForSurvey: (...args: unknown[]) =>
      mockListQuestionsForSurvey(...args),
    getEvidenceRecordsByIds: (...args: unknown[]) =>
      mockGetEvidenceRecordsByIds(...args),
  };
});

import {
  operatorDeclarationDetailMetadata,
  runOrganizationAdminDeclarationDetailPage,
} from "@/features/organization-admin/organization-admin-declaration-detail";

const surveyId = "550e8400-e29b-41d4-a716-446655440001";
const survey = {
  id: surveyId,
  title: "Annual declaration",
  question: "Confirm your details",
  slug: "annual",
  caseNumber: "CASE-1",
  referenceNumber: null,
  dueDate: null,
  submitBefore: null,
  createdAt: new Date("2026-07-01T00:00:00.000Z"),
  updatedAt: new Date("2026-07-01T00:00:00.000Z"),
};

describe("operatorDeclarationDetailMetadata", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListResponsesForSurvey.mockResolvedValue([]);
    mockListQuestionsForSurvey.mockResolvedValue([]);
    mockGetEvidenceRecordsByIds.mockResolvedValue(new Map());
  });

  it("returns dashboard fallback metadata when detail is missing", async () => {
    mockGetSurveyForAdmin.mockResolvedValue(null);

    const metadata = await operatorDeclarationDetailMetadata({
      params: Promise.resolve({ id: "not-a-uuid" }),
    });

    expect(metadata.title).toMatch(/declaration|portal|management/i);
    expect(mockGetSurveyForAdmin).not.toHaveBeenCalled();
  });

  it("returns survey-specific metadata when detail exists", async () => {
    mockGetSurveyForAdmin.mockResolvedValue(survey);

    const metadata = await operatorDeclarationDetailMetadata({
      params: Promise.resolve({ id: surveyId }),
    });

    expect(metadata.title).toContain("Annual declaration");
    expect(metadata.description).toBe("Confirm your details");
  });
});

describe("runOrganizationAdminDeclarationDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListResponsesForSurvey.mockResolvedValue([]);
    mockListQuestionsForSurvey.mockResolvedValue([]);
    mockGetEvidenceRecordsByIds.mockResolvedValue(new Map());
  });

  it("calls notFound when the survey cannot be loaded", async () => {
    mockGetSurveyForAdmin.mockResolvedValue(null);

    await expect(
      runOrganizationAdminDeclarationDetailPage({
        params: Promise.resolve({ id: surveyId }),
      }),
    ).rejects.toThrow("NOT_FOUND");
    expect(mockNotFound).toHaveBeenCalled();
  });

  it("renders detail view when survey loads", async () => {
    mockGetSurveyForAdmin.mockResolvedValue(survey);

    const ui = await runOrganizationAdminDeclarationDetailPage({
      params: Promise.resolve({ id: surveyId }),
    });

    expect(ui).toBeTruthy();
    expect(mockListResponsesForSurvey).toHaveBeenCalledWith(surveyId);
    expect(mockListQuestionsForSurvey).toHaveBeenCalledWith(surveyId);
  });
});
