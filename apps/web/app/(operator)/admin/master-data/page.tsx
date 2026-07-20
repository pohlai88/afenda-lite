import { MasterDataShell } from "@/features/master-data/master-data-shell";

/**
 * Org-admin master-data console — operator coarse role + Tier-2 permissions.
 */
export default function AdminMasterDataPage() {
	return <MasterDataShell surface="admin" />;
}
