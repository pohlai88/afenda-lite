import {
  clientProfilePageMetadata,
  runClientProfilePage,
} from "@/lib/client-profile-page";

export const metadata = clientProfilePageMetadata;
export const dynamic = "force-dynamic";

export default runClientProfilePage;
