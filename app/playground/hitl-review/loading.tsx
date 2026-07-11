export default function PlaygroundRouteReviewLoading() {
  return (
    <div
      className="flex animate-pulse flex-col gap-6"
      aria-busy="true"
      aria-label="Loading route review"
    >
      <div className="space-y-2">
        <div className="bg-muted h-4 w-40 rounded" />
        <div className="bg-muted h-8 w-56 rounded" />
        <div className="bg-muted h-4 max-w-2xl rounded" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="bg-muted h-36 rounded-xl" />
        ))}
      </div>
      <div className="bg-muted h-96 rounded-xl" />
    </div>
  );
}
