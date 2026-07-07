export function PortalLegalNoticeSection({
  id,
  title,
  paragraphs,
}: {
  id: string;
  title: string;
  paragraphs: readonly string[];
}) {
  return (
    <section aria-labelledby={id}>
      <h2 id={id} className="portal-section-title">
        {title}
      </h2>
      <div className="portal-prose mt-2">
        {paragraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>
    </section>
  );
}
