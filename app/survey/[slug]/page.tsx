import {
  openLinkPageMetadata,
  runOpenLinkPage,
} from "@/lib/open-link-entry";

export const dynamic = "force-dynamic";

export const generateMetadata = openLinkPageMetadata;

/** Open declaration link — resolves slug, then routes to sign-in or assignment. */
export default runOpenLinkPage;
