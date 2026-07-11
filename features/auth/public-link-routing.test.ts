import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getAuthSession,
  isAdminSession,
  bootstrapClientAfterAuth,
  getClientProfile,
  getActiveClientAssignmentForSurvey,
} = vi.hoisted(() => ({
  getAuthSession: vi.fn(),
  isAdminSession: vi.fn(),
  bootstrapClientAfterAuth: vi.fn(),
  getClientProfile: vi.fn(),
  getActiveClientAssignmentForSurvey: vi.fn(),
}));

vi.mock("@/modules/identity/auth/get-session", () => ({
  getAuthSession,
}));

vi.mock("@/modules/identity/admin", () => ({
  isAdminSession,
}));

vi.mock("@/modules/identity/auth/bootstrap-client-invite", () => ({
  bootstrapClientAfterAuth,
}));

vi.mock("@/modules/identity/domain/client-profile", () => ({
  getClientProfile,
}));

vi.mock("@/modules/declarations/domain/clients", () => ({
  getActiveClientAssignmentForSurvey,
}));

import { resolvePublicLinkLandingHref } from "@/features/auth/public-link-routing";
import { AUTH_SIGN_IN_HREF, CLIENT_ONBOARDING_HREF } from "@/modules/platform/routing/portal-routes";
import type { Survey } from "@/modules/declarations/domain/surveys";

const survey = {
  id: "survey-1",
  slug: "demo-slug",
  title: "Demo",
  question: "Q?",
  userId: "op-1",
  createdAt: new Date(),
  referenceNumber: null,
  caseNumber: null,
  effectiveDate: null,
  submitBefore: null,
  surveyorName: null,
  surveyorOrg: null,
  surveyeeIndividual: null,
  surveyeeOrg: null,
  purpose: null,
  categories: [],
} satisfies Survey;

describe("resolvePublicLinkLandingHref", () => {
  beforeEach(() => {
    getAuthSession.mockReset();
    isAdminSession.mockReset();
    bootstrapClientAfterAuth.mockReset();
    getClientProfile.mockReset();
    getActiveClientAssignmentForSurvey.mockReset();
    bootstrapClientAfterAuth.mockResolvedValue(undefined);
  });

  it("redirects unauthenticated users to sign-in with returnTo", async () => {
    getAuthSession.mockResolvedValue(null);

    await expect(
      resolvePublicLinkLandingHref(survey, { returnTo: "/survey/demo-slug" }),
    ).resolves.toBe(
      "/auth/sign-in?reason=login-required&returnTo=%2Fsurvey%2Fdemo-slug",
    );
  });

  it("redirects unauthenticated users to sign-in with secure link returnTo", async () => {
    getAuthSession.mockResolvedValue(null);

    await expect(
      resolvePublicLinkLandingHref(survey, { returnTo: "/f/secure-token-abc" }),
    ).resolves.toBe(
      "/auth/sign-in?reason=login-required&returnTo=%2Ff%2Fsecure-token-abc",
    );
  });

  it("redirects unauthenticated users to sign-in without returnTo", async () => {
    getAuthSession.mockResolvedValue(null);

    await expect(resolvePublicLinkLandingHref(survey)).resolves.toBe(
      `${AUTH_SIGN_IN_HREF}?reason=login-required`,
    );
  });

  it("routes operators to declaration detail", async () => {
    getAuthSession.mockResolvedValue({
      user: { id: "op-1", email: "admin@example.com" },
    });
    isAdminSession.mockReturnValue(true);

    await expect(resolvePublicLinkLandingHref(survey)).resolves.toBe(
      "/dashboard/survey-1",
    );
  });

  it("routes clients with incomplete onboarding to wizard", async () => {
    getAuthSession.mockResolvedValue({
      user: { id: "client-1", email: "client@example.com" },
    });
    isAdminSession.mockReturnValue(false);
    getClientProfile.mockResolvedValue({ onboardingComplete: false });

    await expect(resolvePublicLinkLandingHref(survey)).resolves.toBe(
      CLIENT_ONBOARDING_HREF,
    );
  });

  it("routes assigned clients to declare page", async () => {
    getAuthSession.mockResolvedValue({
      user: { id: "client-1", email: "client@example.com" },
    });
    isAdminSession.mockReturnValue(false);
    getClientProfile.mockResolvedValue({ onboardingComplete: true });
    getActiveClientAssignmentForSurvey.mockResolvedValue({ id: "assignment-9" });

    await expect(resolvePublicLinkLandingHref(survey)).resolves.toBe(
      "/client/declare/assignment-9",
    );
  });

  it("falls back to client home when onboarding complete and no assignment", async () => {
    getAuthSession.mockResolvedValue({
      user: { id: "client-1", email: "client@example.com" },
    });
    isAdminSession.mockReturnValue(false);
    getClientProfile.mockResolvedValue({ onboardingComplete: true });
    getActiveClientAssignmentForSurvey.mockResolvedValue(null);

    await expect(resolvePublicLinkLandingHref(survey)).resolves.toBe("/client");
  });
});
