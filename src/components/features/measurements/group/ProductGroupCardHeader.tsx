"use client";

import { ChevronDown, ChevronUp, Copy, Trash2 } from "lucide-react";
import type { ProductGroup } from "@/types";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import {
  formatProductGroupHeading,
  formatInteriorModelDisplay,
  getMaterialLabel,
} from "@/lib/measurementLabels";
import { cn } from "@/lib/cn";

export function ProductGroupCardHeader({
  group,
  gIdx,
  specLocked,
  completenessHints,
  onToggleGroup,
  onCloneGroup,
  onRemoveGroup,
}: {
  group: ProductGroup;
  gIdx: number;
  specLocked: boolean;
  completenessHints: string[];
  onToggleGroup: (id: number) => void;
  onCloneGroup: (group: ProductGroup) => void;
  onRemoveGroup: (id: number) => void;
}) {
  const confirm = useConfirm();

  return (
    <div
      className={cn(
        "flex cursor-pointer items-center justify-between p-4 transition-colors",
        group.isOpen ? "border-b-2 border-border bg-muted" : "bg-card"
      )}
      onClick={() => onToggleGroup(group.id)}
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-muted-foreground font-bold">
          {gIdx + 1}
        </div>
        <div>
          <h4 className="font-black text-foreground text-lg">
            {formatProductGroupHeading(group.type, group.details.customName)}
          </h4>
          <p className="text-xs text-muted-foreground font-black uppercase tracking-wider">
            {group.measurements.reduce((acc, m) => acc + (parseInt(m.qty as string) || 0), 0)} uni •{" "}
            {group.type === "ESTORE_INTERIOR"
              ? formatInteriorModelDisplay(group.details) || "Sem specs"
              : getMaterialLabel(group.details.material, group.details.otherMaterial) ||
                group.details.model ||
                "Sem specs"}
          </p>
          {completenessHints.length > 0 ? (
            <p className="mt-0.5 text-xs font-bold text-warning-solid normal-case tracking-normal">
              {completenessHints.join(" · ")}
            </p>
          ) : null}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {!specLocked && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onCloneGroup(group);
              }}
              className="flex min-h-12 min-w-12 items-center justify-center text-muted-foreground hover:text-info-solid active:scale-95"
              title="Duplicar produto"
              aria-label="Duplicar produto"
            >
              <Copy className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={async (e) => {
                e.stopPropagation();
                const ok = await confirm({
                  title: "Remover produto?",
                  description:
                    "Este produto e todas as linhas de medição associadas serão removidos.",
                  confirmLabel: "Remover",
                  cancelLabel: "Cancelar",
                  destructive: true,
                });
                if (ok) onRemoveGroup(group.id);
              }}
              className="flex min-h-12 min-w-12 items-center justify-center text-muted-foreground hover:text-danger-solid active:scale-95"
              aria-label="Remover produto"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </>
        )}
        {group.isOpen ? (
          <ChevronUp className="w-5 h-5 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-5 h-5 text-muted-foreground" />
        )}
      </div>
    </div>
  );
}