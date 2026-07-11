import { OrganizationAdminUsersView as OrganizationAdminUsersViewFeature } from "@/features/organization-admin/organization-admin-users-view";
import type { OrganizationAdminUserDisplay } from "@/lib/pages/organization-admin-users-page";

export default function OrganizationAdminUsersView({
  user,
}: {
  user: OrganizationAdminUserDisplay;
}) {
  return <OrganizationAdminUsersViewFeature user={user} />;
}
