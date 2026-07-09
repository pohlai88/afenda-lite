import {
  clientDashboardPageMetadata,
  runClientDashboardPage,
} from "@/lib/client-dashboard-page";

export const metadata = clientDashboardPageMetadata;
export const dynamic = "force-dynamic";

export default runClientDashboardPage;
