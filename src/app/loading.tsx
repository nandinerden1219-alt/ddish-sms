import CardSkeleton from "@/components/public/CardSkeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-340 px-4 py-6.5 sm:px-6">
      <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2 2xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
