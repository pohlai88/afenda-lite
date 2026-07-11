import OrganizationAdminDeclarationsDashboard from "@/components-V2/platform-views/portal-views/organization-admin-declarations-dashboard";
import {
  loadOrganizationAdminDashboardPage,
  organizationAdminDashboardPageMetadata,
} from "@/features/organization-admin/organization-admin-dashboard-page";

export const metadata = organizationAdminDashboardPageMetadata;
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const data = await loadOrganizationAdminDashboardPage();
  return <OrganizationAdminDeclarationsDashboard data={data} />;
}
