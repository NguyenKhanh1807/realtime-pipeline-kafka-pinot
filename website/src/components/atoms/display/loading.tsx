import { Skeleton } from "@/src/components/atoms";
import { cn } from "@/src/lib";

interface LoadingProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  variant?: "spinner" | "pulse" | "skeleton";
}

const sizeClasses = {
  sm: "w-4 h-4",
  md: "w-6 h-6",
  lg: "w-8 h-8",
};

export function Loading({
  className,
  size = "md",
  variant = "spinner"
}: LoadingProps) {
  if (variant === "spinner") {
    return (
      <div
        className={cn(
          "animate-spin rounded-full border-2 border-primary border-t-transparent",
          sizeClasses[size],
          className
        )}
      />
    );
  }

  if (variant === "pulse") {
    return (
      <div
        className={cn(
          "animate-pulse rounded-full bg-primary",
          sizeClasses[size],
          className
        )}
      />
    );
  }

  // Default to skeleton
  return <Skeleton className={cn(sizeClasses[size], className)} />;
}

// LoadingSpinner - alias for backwards compatibility
export const LoadingSpinner = Loading;

// Skeleton components for common use cases
export function LoadingCard() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-4 w-[250px]" />
      <Skeleton className="h-4 w-[200px]" />
      <Skeleton className="h-4 w-[180px]" />
    </div>
  );
}

export function LoadingTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex space-x-2">
          {Array.from({ length: cols }).map((_, j) => (
            <Skeleton key={j} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}
