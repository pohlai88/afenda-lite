import { portalCopy } from "@/lib/portal-copy";

export function ClientOnboardingContext() {
  const {
    legalNoticeTitle,
    legalNotice,
    dataCollectionTitle,
    dataCollectionIntro,
    dataCollectionItems,
    dataCollectionFooter,
    policyNoticeTitle,
    policyNotice,
  } = portalCopy.clientOnboarding;

  return (
    <div className="v-stack gap-6">
      <section aria-labelledby="onboarding-legal-notice">
        <h2 id="onboarding-legal-notice" className="portal-section-title">
          {legalNoticeTitle}
        </h2>
        <div className="portal-prose mt-2">
          {legalNotice.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      </section>

      <section aria-labelledby="onboarding-data-collection">
        <h2 id="onboarding-data-collection" className="portal-section-title">
          {dataCollectionTitle}
        </h2>
        <div className="portal-prose mt-2">
          <p>{dataCollectionIntro}</p>
        </div>
        <dl className="mt-4 space-y-3 text-sm">
          {dataCollectionItems.map((item) => (
            <div
              key={item.field}
              className="rounded-lg border bg-muted/30 px-4 py-3"
            >
              <dt className="font-medium text-foreground">{item.field}</dt>
              <dd className="mt-1 text-muted-foreground">{item.purpose}</dd>
            </div>
          ))}
        </dl>
        <div className="portal-prose mt-4">
          <p>{dataCollectionFooter}</p>
        </div>
      </section>

      <section aria-labelledby="onboarding-policy-notice">
        <h2 id="onboarding-policy-notice" className="portal-section-title">
          {policyNoticeTitle}
        </h2>
        <ul className="mt-2 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
          {policyNotice.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
