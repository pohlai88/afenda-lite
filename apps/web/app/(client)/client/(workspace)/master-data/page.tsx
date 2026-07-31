import { MasterDataShell } from "@/features/master-data/master-data-shell";

/**
 * Client workspace master-data — exact read capabilities; package-authorized writes.
 */
export default function ClientMasterDataPage() {
	return <MasterDataShell surface="client" />;
}
