import CardSkeleton from "@/components/public/CardSkeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-340 px-4 py-6.5 sm:px-6">
      <div className="flex flex-col gap-3.5">
        {Array.from({ length: 6 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
