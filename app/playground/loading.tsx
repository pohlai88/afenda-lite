export default function PlaygroundLoading() {
  return (
    <div
      className="flex animate-pulse flex-col gap-6"
      aria-busy="true"
      aria-label="Loading playground"
    >
      <div className="space-y-2">
        <div className="bg-muted h-4 w-36 rounded" />
        <div className="bg-muted h-8 w-64 rounded" />
        <div className="bg-muted h-4 max-w-xl rounded" />
      </div>
      <div className="bg-muted h-[32rem] rounded-xl" />
    </div>
  );
}
