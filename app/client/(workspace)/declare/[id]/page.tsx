import {
  clientDeclarePageMetadata,
  runClientDeclarePage,
} from "@/lib/client-declare-page";

export const metadata = clientDeclarePageMetadata;
export const dynamic = "force-dynamic";

export default runClientDeclarePage;
