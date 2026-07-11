import { redirect } from "next/navigation";
import { FFT_HOME_HREF } from "@/modules/platform/routing/portal-routes";

export default function TradeIndexPage() {
  redirect(FFT_HOME_HREF);
}
