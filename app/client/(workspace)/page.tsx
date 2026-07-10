import {
  clientDashboardPageMetadata,
  runClientDashboardPage,
} from "@/lib/pages/client-dashboard-page";

export const metadata = clientDashboardPageMetadata;
export const dynamic = "force-dynamic";

/** Client home — product UI tombstoned; stable unavailable page (no redirect loop). */
export default async function ClientHomePage() {
  return runClientDashboardPage();
}
