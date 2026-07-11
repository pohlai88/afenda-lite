import { OrganizationAdminUsersList as OrganizationAdminUsersListFeature } from "@/features/organization-admin/organization-admin-users-list";
import type { OrganizationAdminUsersPageData } from "@/lib/pages/organization-admin-users-page";

export default function OrganizationAdminUsersList({
  data,
}: {
  data: OrganizationAdminUsersPageData;
}) {
  return <OrganizationAdminUsersListFeature data={data} />;
}
