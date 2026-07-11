import OrganizationAdminUsersList from "@/components-V2/platform-views/portal-views/organization-admin-users-list";
import {
  loadOrganizationAdminUsersPage,
  organizationAdminUsersPageMetadata,
} from "@/features/organization-admin/organization-admin-users-page";

export const metadata = organizationAdminUsersPageMetadata;
export const dynamic = "force-dynamic";

export default async function DashboardUsersPage() {
  const data = await loadOrganizationAdminUsersPage();
  return <OrganizationAdminUsersList data={data} />;
}
