import {
  clientOnboardingPageMetadata,
  runClientOnboardingPage,
} from "@/lib/pages/client-onboarding-page";

export const metadata = clientOnboardingPageMetadata;
export const dynamic = "force-dynamic";

/** Client onboarding — wizard tombstoned; stable unavailable page (no redirect loop). */
export default async function ClientOnboardingPage() {
  return runClientOnboardingPage();
}
