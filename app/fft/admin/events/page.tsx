import Link from "next/link";
import {
  TradeEnsureTemplateButton,
  TradeNewEventForm,
} from "@/features/fft/fft-admin-forms";
import { TradeAddSalesMemberForm } from "@/features/fft/fft-sales-member-form";
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
import { Separator } from "@/components-V2/platform-components/ui/separator";
import { listEvents, listSalesMembers } from "@/modules/fft/domain/store";
import { fftHref } from "@/modules/fft/i18n/fft-i18n";
import { resolveFftOrganizationContext } from "@/features/fft/fft-organization-context";

export const dynamic = "force-dynamic";

/**
 * Admin events — form-layout + datatable composition
 * (ACN-BLK-FORMS-FORM-LAYOUTS-VERTICAL + FFT-UI-EVT-LIST).
 */
export default async function FftAdminEventsPage() {
  const org = await resolveFftOrganizationContext();
  const [events, members] = await Promise.all([
    listEvents({
      includeTemplates: true,
      organizationId: org.organizationId,
    }),
    listSalesMembers(org.organizationId),
  ]);

  return (
    <main className="space-y-8 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Admin · Events</h1>
        <p className="text-muted-foreground text-sm">
          Create programs, seed templates, manage sales membership.
        </p>
        <Link className="text-sm underline" href={fftHref("/events")}>
          Sales event list
        </Link>
      </div>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>New event</CardTitle>
            <CardDescription>
              Create a program or seed the piglet template.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <TradeNewEventForm locale={FFT_UI_LOCALE} />
            <Separator />
            <TradeEnsureTemplateButton locale={FFT_UI_LOCALE} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Sales members</CardTitle>
            <CardDescription>Allowlist emails for trade sales access.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <TradeAddSalesMemberForm locale={FFT_UI_LOCALE} />
            <Separator />
            <div className="space-y-1" data-testid="fft-sales-members">
              {members.length === 0 ? (
                <p className="text-muted-foreground text-sm">No members yet.</p>
              ) : (
                members.map((m) => (
                  <p key={m.email} className="text-muted-foreground text-sm">
                    {m.email}
                  </p>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </section>

      <Card className="overflow-hidden py-0">
        <CardHeader className="px-6 pt-6">
          <CardTitle>All events</CardTitle>
          <CardDescription>
            Sort, filter, and open setup or allocation.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <FftEventsList
            events={toFftEventListItems(events)}
            locale={FFT_UI_LOCALE}
            variant="admin"
          />
        </CardContent>
      </Card>
    </main>
  );
}
