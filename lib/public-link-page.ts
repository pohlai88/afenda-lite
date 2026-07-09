import "server-only";

/**
 * Shared redirect-only helpers for S5 public declaration links.
 *
 * Used by `/survey/[slug]` and `/f/[token]` entry modules only.
 * Do not wire S6 `/invite/[token]` or org `/join` through this module.
 */
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import type { z } from "zod";
import { PORTAL_NAME } from "@/lib/portal-copy";
import {
  publicLinkPageRobots,
  resolvePublicLinkLandingHref,
} from "@/lib/public-link-routing";
import type { Survey } from "@/lib/surveys";

/** Cached survey lookup for open slug or secure token public link routes. */
export function createCachedPublicLinkSurveyLoader<T>(
  schema: z.ZodType<T>,
  fetchSurvey: (parsed: T) => Promise<Survey | null>,
) {
  return cache(async (rawValue: string) => {
    const parsed = schema.safeParse(rawValue);
    if (!parsed.success) {
      return null;
    }

    return fetchSurvey(parsed.data);
  });
}

/** Canonical returnTo path for post-login resume on public declaration links. */
export function resolvePublicLinkReturnTo<T>(
  rawValue: string,
  survey: Survey,
  schema: z.ZodType<T>,
  buildHref: (value: T) => string,
  buildFallbackHref: (rawValue: string, survey: Survey) => string,
): string {
  const parsed = schema.safeParse(rawValue);
  return parsed.success
    ? buildHref(parsed.data)
    : buildFallbackHref(rawValue, survey);
}

/** Shared redirect-only page handler for `/survey/[slug]` and `/f/[token]`. */
export async function runPublicLinkRedirect(options: {
  rawValue: string;
  loadSurvey: (rawValue: string) => Promise<Survey | null>;
  resolveReturnTo: (survey: Survey) => string;
}): Promise<never> {
  const survey = await options.loadSurvey(options.rawValue);
  if (!survey) {
    notFound();
  }

  redirect(
    await resolvePublicLinkLandingHref(survey, {
      returnTo: options.resolveReturnTo(survey),
    }),
  );
}

export async function buildPublicLinkMetadata(options: {
  rawValue: string;
  loadSurvey: (rawValue: string) => Promise<Survey | null>;
  missingTitle: string;
  missingDescription: string;
  surveyDescription: string;
}): Promise<Metadata> {
  const survey = await options.loadSurvey(options.rawValue);

  if (!survey) {
    return {
      title: `${PORTAL_NAME} — ${options.missingTitle}`,
      description: options.missingDescription,
      robots: publicLinkPageRobots,
    };
  }

  return {
    title: `${PORTAL_NAME} — ${survey.title}`,
    description: options.surveyDescription,
    robots: publicLinkPageRobots,
  };
}
