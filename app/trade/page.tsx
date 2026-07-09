import { redirect } from "next/navigation";
import { defaultTradeLocale } from "@/lib/i18n/trade";

export default function TradeRootPage() {
  redirect(`/trade/${defaultTradeLocale}/events`);
}
