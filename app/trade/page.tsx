import { redirect } from "next/navigation";
import { TRADE_HOME_HREF } from "@/modules/platform/routing/portal-routes";

export default function TradeIndexPage() {
  redirect(TRADE_HOME_HREF);
}
