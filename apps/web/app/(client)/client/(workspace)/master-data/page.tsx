import { MasterDataShell } from "@/features/master-data/master-data-shell";

/**
 * Client workspace master-data — session + `master_data.read` / manage.
 */
export default function ClientMasterDataPage() {
	return <MasterDataShell surface="client" />;
}
