import Link from "next/link";
import { FftEventsList } from "@/features/fft/fft-events-list";
import { toFftEventListItems } from "@/features/fft/fft-events-list-model";
import { FFT_UI_LOCALE } from "@/features/fft/fft-ui-locale";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components-V2/platform-components/ui/card";
import { listEvents } from "@/modules/fft/domain/store";
import { fftHref } from "@/modules/fft/i18n/fft-i18n";

export const dynamic = "force-dynamic";

/** Sales events — FFT-UI-EVT-LIST datatable DNA composition. */
export default async function FftEventsPage() {
  const events = await listEvents({ includeTemplates: false });

  return (
    <main className="space-y-6 p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Events</h1>
          <p className="text-muted-foreground text-sm">
            Feed Farm Trade programs — open windows, take orders, allocate.
          </p>
        </div>
        <div className="flex gap-2">
          <Link className="text-sm underline" href={fftHref("/admin/events")}>
            Admin events
          </Link>
          <Link className="text-sm underline" href={fftHref("/my-orders")}>
            My orders
          </Link>
        </div>
      </div>

      <Card className="overflow-hidden py-0">
        <CardHeader className="px-6 pt-6">
          <CardTitle>Program list</CardTitle>
          <CardDescription>
            Search, filter by status, and open an order window.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <FftEventsList
            events={toFftEventListItems(events)}
            locale={FFT_UI_LOCALE}
            variant="sales"
          />
        </CardContent>
      </Card>
    </main>
  );
}
