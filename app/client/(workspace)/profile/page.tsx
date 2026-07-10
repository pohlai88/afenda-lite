import {
  clientProfilePageMetadata,
  runClientProfilePage,
} from "@/lib/pages/client-profile-page";

export const metadata = clientProfilePageMetadata;
export const dynamic = "force-dynamic";

/** Client profile — product UI tombstoned; stable unavailable page (no redirect loop). */
export default async function ClientProfilePage() {
  return runClientProfilePage();
}
