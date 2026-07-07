import {
  legacyInvitePageMetadata,
  runLegacyInviteTokenPage,
} from "@/lib/legacy-invite-entry";

export const metadata = legacyInvitePageMetadata;
export const dynamic = "force-dynamic";

/** Legacy portal invite URLs — validate token, then client sign-in dispatch. */
export default runLegacyInviteTokenPage;
