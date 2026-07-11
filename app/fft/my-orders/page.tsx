import Link from "next/link";
import {
  FftMyOrdersList,
  toTradeMyOrderListItems,
} from "@/features/fft/fft-my-orders-list";
import { FFT_UI_LOCALE } from "@/features/fft/fft-ui-locale";
import { requireFftAccess } from "@/modules/fft/auth/fft-session";
import { listAllOrdersForSalesperson } from "@/modules/fft/domain/store";
import { fftHref } from "@/modules/fft/i18n/fft-i18n";

export const dynamic = "force-dynamic";

export default async function FftMyOrdersPage() {
  const access = await requireFftAccess();
  const orders = await listAllOrdersForSalesperson(access.userId);

  return (
    <main className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">My orders</h1>
        <Link className="text-sm underline" href={fftHref("/events")}>
          Events
        </Link>
      </div>

      <FftMyOrdersList
        orders={toTradeMyOrderListItems(orders)}
        locale={FFT_UI_LOCALE}
      />
    </main>
  );
}
