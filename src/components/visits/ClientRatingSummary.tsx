import { Star } from "lucide-react";
import { cn } from "@/lib/cn";

type Props = {
  rating?: number | null;
  feedback?: string | null;
  /** Lista: estrelas e comentário numa linha curta. */
  compact?: boolean;
};

export function ClientRatingSummary({ rating, feedback, compact = false }: Props) {
  if (!rating || rating < 1) return null;
  const comment = feedback?.trim();

  return (
    <div className={compact ? "mt-2 space-y-1" : "space-y-2 rounded-xl border-2 border-border bg-muted/40 p-3"}>
      <div className="flex items-center gap-2" aria-label={`${rating} em 5 estrelas`}>
        <div className="flex gap-0.5">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              className={cn(
                "h-4 w-4",
                star <= rating ? "fill-warning-solid text-warning-solid" : "text-muted-foreground"
              )}
              aria-hidden
            />
          ))}
        </div>
        <span className="ds-num text-xs font-bold text-muted-foreground">{rating}/5</span>
      </div>
      {comment ? (
        <p
          className={cn(
            "font-medium italic text-foreground",
            compact ? "line-clamp-2 text-xs" : "text-sm"
          )}
        >
          “{comment}”
        </p>
      ) : null}
    </div>
  );
}
