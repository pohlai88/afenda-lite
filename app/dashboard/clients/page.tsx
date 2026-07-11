import OrganizationAdminClientsList from "@/components-V2/platform-views/portal-views/organization-admin-clients-list";
import {
  loadOrganizationAdminClientsPage,
  operatorClientsPageMetadata,
} from "@/features/organization-admin/organization-admin-clients-page";

export const metadata = operatorClientsPageMetadata;
export const dynamic = "force-dynamic";

export default async function DashboardClientsPage() {
  const data = await loadOrganizationAdminClientsPage();
  return <OrganizationAdminClientsList data={data} />;
}
