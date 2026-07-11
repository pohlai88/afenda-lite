import { OrganizationAdminUsersView as OrganizationAdminUsersViewFeature } from "@/features/organization-admin/organization-admin-users-view";
import type {
  OrganizationAdminUserDisplay,
  OrganizationAdminUserSessionDisplay,
} from "@/features/organization-admin/organization-admin-users-page";

export default function OrganizationAdminUsersView({
  user,
  sessions = [],
}: {
  user: OrganizationAdminUserDisplay;
  sessions?: OrganizationAdminUserSessionDisplay[];
}) {
  return (
    <OrganizationAdminUsersViewFeature user={user} sessions={sessions} />
  );
}
