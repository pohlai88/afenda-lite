import {
  playgroundHitlReviewPageMetadata,
  runPlaygroundHitlReviewPage,
} from "@/features/playground/playground-hitl-review-page";

export const dynamic = "force-dynamic";

export const metadata = playgroundHitlReviewPageMetadata;

export default async function PlaygroundHitlReviewPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return runPlaygroundHitlReviewPage({ searchParams });
}
