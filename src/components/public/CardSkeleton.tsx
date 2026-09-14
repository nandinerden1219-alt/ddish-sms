export default function CardSkeleton() {
  return (
    <div className="animate-pulse rounded-md border border-neutral-300 bg-surface p-5">
      <div className="mb-2.5 flex items-center gap-2">
        <div className="h-4 w-24 rounded-full bg-neutral-300" />
      </div>
      <div className="mb-3 h-4 w-2/3 rounded bg-neutral-300" />
      <div className="space-y-2 rounded-sm border border-neutral-200 bg-background p-3.5">
        <div className="h-3 w-full rounded bg-neutral-200" />
        <div className="h-3 w-5/6 rounded bg-neutral-200" />
        <div className="h-3 w-4/6 rounded bg-neutral-200" />
      </div>
      <div className="mt-3.5 h-9 w-28 rounded-full bg-neutral-300" />
    </div>
  );
}
