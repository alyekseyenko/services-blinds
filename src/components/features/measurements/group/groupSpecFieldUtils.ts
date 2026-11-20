import { cn } from "@/lib/cn";

export function measurementGroupFieldId(groupId: number, field: string): string {
  return `measurement-group-${groupId}-${field}`;
}

export function specOptionBtn(active: boolean): string {
  return cn(
    "min-h-12 rounded-xl border-2 px-2 text-xs font-black uppercase transition-all",
    active
      ? "border-primary bg-primary/15 text-foreground"
      : "border-border bg-card text-muted-foreground"
  );
}