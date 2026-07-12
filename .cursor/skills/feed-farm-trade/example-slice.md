# FFT — example slice (setup page pattern)

**Copy this shape** for P1 wires. Source of truth in repo:  
`app/fft/admin/events/[eventId]/setup/page.tsx` · `features/fft/trade-setup-forms.tsx` · `features/fft/trade-ui-locale.ts`.

## Pattern

```text
Thin RSC page
  → domain reads (list*/get*)
  → compose client features
Client feature
  → startTransition + Server Action(FFT_UI_LOCALE, …)
  → getTradeActionError(result)
  → router.refresh() on success
Action
  → requireFftPermission / requireFftAdmin
  → Zod / FormData parse
  → modules/fft domain
  → TradeActionResult
```

## 1. Locale constant (paths stay flat)

```ts
// features/fft/trade-ui-locale.ts
export { defaultTradeLocale as FFT_UI_LOCALE } from "@/modules/fft/i18n/trade";
```

## 2. Thin page (RSC)

```tsx
import { FFT_UI_LOCALE } from "@/features/fft/trade-ui-locale";
import { TradeProductForm /* … */ } from "@/features/fft/trade-setup-forms";
import { getEventById, listProductsForEvent /* … */ } from "@/modules/fft/domain/store";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ eventId: string }> };

export default async function TradeEventSetupPage({ params }: Props) {
  const { eventId } = await params;
  const event = await getEventById(eventId);
  // notFound() if missing
  const products = await listProductsForEvent(eventId);

  return (
    <main className="space-y-8 p-6">
      <TradeProductForm
        locale={FFT_UI_LOCALE}
        eventId={eventId}
        eventStatus={event.status}
      />
      {/* map products → forms; audit list; etc. */}
    </main>
  );
}
```

Rules: await `params`; no SQL in page; no `FftShell`; hrefs via `fftHref(...)`.

## 3. Client form → action

```tsx
"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { saveTradeEventSetupAction } from "@/app/actions/fft";
import { getTradeActionError } from "@/modules/fft/domain/trade-action-result";

// inside form action:
startTransition(async () => {
  const result = await saveTradeEventSetupAction(locale, event.id, formData);
  const err = getTradeActionError(result);
  if (err) {
    setError(err);
    return;
  }
  router.refresh();
});
```

## 4. Anti-patterns

| Bad | Good |
|-----|------|
| `fetch('/api/fft/…')` from RSC | Domain import |
| Mount locale switcher | `FFT_UI_LOCALE` only |
| Check `role === "admin"` | `requireFftPermission("event.edit")` |
| Swallow action errors | `getTradeActionError` + show message |
| Fat page with FormData parse | Parse in `app/actions/fft.ts` |

## 5. After copying

1. Match row in [action-map.md](action-map.md).  
2. Confirm code in [rbac-card.md](rbac-card.md).  
3. Add/run test per [verify.md](verify.md).  
4. Record AC evidence.  
