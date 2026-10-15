import { Skeleton } from "@/components/ui/skeleton";

/** Static skeleton, no shimmer (ui standard §10.1). */
export default function Loading() {
  return (
    <div aria-busy className="flex flex-col gap-4">
      <Skeleton className="h-8 w-40" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-64" />
    </div>
  );
}
