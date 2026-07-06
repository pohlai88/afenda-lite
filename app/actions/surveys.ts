"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminSession } from "@/app/actions/admin";
import {
  createSurvey,
  getSurveyBySlug,
  submitSurveyResponse,
} from "@/lib/surveys";

export async function createSurveyAction(formData: FormData) {
  const session = await requireAdminSession();
  const title = String(formData.get("title") ?? "").trim();
  const question = String(formData.get("question") ?? "").trim();

  if (!title || !question) {
    throw new Error("Title and question are required.");
  }

  const survey = await createSurvey({
    title,
    question,
    userId: session.user.id,
  });
  revalidatePath("/dashboard");
  redirect(`/dashboard/${survey.id}`);
}

export async function submitSurveyResponseAction(formData: FormData) {
  const slug = String(formData.get("slug") ?? "").trim();
  const rating = Number(formData.get("rating"));
  const comment = String(formData.get("comment") ?? "").trim();

  if (!slug || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { error: "Please choose a rating from 1 to 5." };
  }

  const survey = await getSurveyBySlug(slug);
  if (!survey) {
    return { error: "Survey not found." };
  }

  await submitSurveyResponse({
    surveyId: survey.id,
    rating,
    comment: comment || undefined,
  });

  return { success: true };
}
