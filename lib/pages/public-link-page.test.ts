import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSurveyBySlug, getSurveyByInviteToken, resolvePublicLinkLandingHref, notFound, redirect } =
  vi.hoisted(() => ({
    getSurveyBySlug: vi.fn(),
    getSurveyByInviteToken: vi.fn(),
    resolvePublicLinkLandingHref: vi.fn(),
    notFound: vi.fn(),
    redirect: vi.fn(),
  }));

vi.mock("@/lib/domain/surveys", () => ({
  getSurveyBySlug,
  getSurveyByInviteToken,
}));

vi.mock("@/lib/routing/public-link-routing", () => ({
  publicLinkPageRobots: { index: false, follow: false },
  resolvePublicLinkLandingHref,
}));

vi.mock("next/navigation", () => ({
  notFound,
  redirect,
}));

import { loadOpenLinkSurvey, runOpenLinkPage } from "@/lib/entry/open-link-entry";
import {
  loadSecureLinkSurvey,
  runSecureLinkPage,
} from "@/lib/entry/secure-link-entry";
import {
  createCachedPublicLinkSurveyLoader,
  resolvePublicLinkReturnTo,
} from "@/lib/pages/public-link-page";
import { openSurveyHref, secureLinkHref } from "@/lib/routing/portal-routes";
import { openSurveySlugParamSchema, surveyInviteTokenParamSchema } from "@/lib/schemas/surveys";
import type { Survey } from "@/lib/domain/surveys";

const survey = {
  id: "survey-1",
  slug: "demo-slug",
  title: "Demo declaration",
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

describe("createCachedPublicLinkSurveyLoader", () => {
  it("returns null for invalid params", async () => {
    const loader = createCachedPublicLinkSurveyLoader(
      openSurveySlugParamSchema,
      getSurveyBySlug,
    );

    await expect(loader("")).resolves.toBeNull();
    expect(getSurveyBySlug).not.toHaveBeenCalled();
  });

  it("loads survey for valid params", async () => {
    getSurveyBySlug.mockResolvedValue(survey);
    const loader = createCachedPublicLinkSurveyLoader(
      openSurveySlugParamSchema,
      getSurveyBySlug,
    );

    await expect(loader("demo-slug")).resolves.toEqual(survey);
    expect(getSurveyBySlug).toHaveBeenCalledWith("demo-slug");
  });
});

describe("resolvePublicLinkReturnTo", () => {
  it("builds canonical open link return paths", () => {
    expect(
      resolvePublicLinkReturnTo(
        "demo-slug",
        survey,
        openSurveySlugParamSchema,
        openSurveyHref,
        (_raw, resolvedSurvey) => openSurveyHref(resolvedSurvey.slug),
      ),
    ).toBe("/survey/demo-slug");
  });

  it("builds canonical secure link return paths", () => {
    expect(
      resolvePublicLinkReturnTo(
        "secure-token",
        survey,
        surveyInviteTokenParamSchema,
        secureLinkHref,
        (rawValue) => secureLinkHref(rawValue.trim()),
      ),
    ).toBe("/f/secure-token");
  });
});

describe("loadOpenLinkSurvey", () => {
  beforeEach(() => {
    getSurveyBySlug.mockReset();
  });

  it("returns null for invalid slug", async () => {
    await expect(loadOpenLinkSurvey("")).resolves.toBeNull();
  });

  it("loads survey by slug", async () => {
    getSurveyBySlug.mockResolvedValue(survey);
    await expect(loadOpenLinkSurvey("demo-slug")).resolves.toEqual(survey);
  });
});

describe("loadSecureLinkSurvey", () => {
  beforeEach(() => {
    getSurveyByInviteToken.mockReset();
  });

  it("returns null for invalid token", async () => {
    await expect(loadSecureLinkSurvey("")).resolves.toBeNull();
  });

  it("loads survey by invite token", async () => {
    getSurveyByInviteToken.mockResolvedValue(survey);
    await expect(loadSecureLinkSurvey("secure-token")).resolves.toEqual(survey);
    expect(getSurveyByInviteToken).toHaveBeenCalledWith("secure-token");
  });
});

describe("runOpenLinkPage", () => {
  beforeEach(() => {
    getSurveyBySlug.mockReset();
    resolvePublicLinkLandingHref.mockReset();
    notFound.mockReset();
    redirect.mockReset();
    notFound.mockImplementation(() => {
      throw new Error("NOT_FOUND");
    });
    resolvePublicLinkLandingHref.mockResolvedValue("/auth/sign-in?reason=login-required");
  });

  it("calls notFound for unknown slug", async () => {
    getSurveyBySlug.mockResolvedValue(null);

    await expect(
      runOpenLinkPage({ params: Promise.resolve({ slug: "missing" }) }),
    ).rejects.toThrow("NOT_FOUND");

    expect(notFound).toHaveBeenCalledTimes(1);
    expect(redirect).not.toHaveBeenCalled();
  });

  it("redirects with returnTo for valid slug", async () => {
    getSurveyBySlug.mockResolvedValue(survey);

    await runOpenLinkPage({ params: Promise.resolve({ slug: "demo-slug" }) });

    expect(resolvePublicLinkLandingHref).toHaveBeenCalledWith(survey, {
      returnTo: "/survey/demo-slug",
    });
    expect(redirect).toHaveBeenCalledWith("/auth/sign-in?reason=login-required");
  });
});

describe("runSecureLinkPage", () => {
  beforeEach(() => {
    getSurveyByInviteToken.mockReset();
    resolvePublicLinkLandingHref.mockReset();
    notFound.mockReset();
    redirect.mockReset();
    notFound.mockImplementation(() => {
      throw new Error("NOT_FOUND");
    });
    resolvePublicLinkLandingHref.mockResolvedValue("/client/declare/assignment-1");
  });

  it("calls notFound for unknown token", async () => {
    getSurveyByInviteToken.mockResolvedValue(null);

    await expect(
      runSecureLinkPage({ params: Promise.resolve({ token: "missing" }) }),
    ).rejects.toThrow("NOT_FOUND");

    expect(notFound).toHaveBeenCalledTimes(1);
    expect(redirect).not.toHaveBeenCalled();
  });

  it("redirects with returnTo for valid token", async () => {
    getSurveyByInviteToken.mockResolvedValue(survey);

    await runSecureLinkPage({ params: Promise.resolve({ token: "secure-token" }) });

    expect(resolvePublicLinkLandingHref).toHaveBeenCalledWith(survey, {
      returnTo: "/f/secure-token",
    });
    expect(redirect).toHaveBeenCalledWith("/client/declare/assignment-1");
  });
});
