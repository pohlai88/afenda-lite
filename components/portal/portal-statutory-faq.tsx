"use client";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDownIcon } from "lucide-react";

/** Collapsible FAQ rows — adapted from faq-component-01 for portal context panels. */
export function PortalStatutoryFaq({
  id,
  title,
  items,
}: {
  id: string;
  title: string;
  items: readonly { question: string; answer: string }[];
}) {
  if (items.length === 0) return null;

  return (
    <section aria-labelledby={id}>
      <h2 id={id} className="portal-section-title">
        {title}
      </h2>
      <div className="mt-3 space-y-2">
        {items.map((item) => (
          <Collapsible
            key={item.question}
            className="rounded-lg border bg-muted/30 px-4 py-1"
          >
            <CollapsibleTrigger className="flex w-full min-w-0 items-center justify-between gap-3 py-3 text-left text-sm font-medium [&[data-panel-open]>svg]:rotate-180">
              <span className="text-pretty">{item.question}</span>
              <ChevronDownIcon
                aria-hidden="true"
                className="size-4 shrink-0 text-muted-foreground transition-transform"
              />
            </CollapsibleTrigger>
            <CollapsibleContent className="pb-3 text-sm text-muted-foreground text-pretty">
              {item.answer}
            </CollapsibleContent>
          </Collapsible>
        ))}
      </div>
    </section>
  );
}

/** Matrix registry alias for `faq-component-01` adoption. */
export { PortalStatutoryFaq as PortalFaqSection };
