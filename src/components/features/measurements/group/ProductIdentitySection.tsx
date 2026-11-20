"use client";

import { Box } from "lucide-react";
import type { ProductGroup, ProductType } from "@/types";
import { PRODUCT_TYPE_OPTIONS } from "@/lib/measurementLabels";
import { MeasurementFormSection } from "@/components/features/measurements/MeasurementFormSection";
import type { MeasurementFormSectionStep } from "@/lib/measurements/groupFormSectionMeta";
import { measurementGroupFieldId } from "@/components/features/measurements/group/groupSpecFieldUtils";

export function ProductIdentitySection({
  group,
  specLocked,
  focusMeasurements,
  openSection,
  section1Summary,
  setSectionOpen,
  onUpdateGroupType,
  onUpdateGroupDetails,
}: {
  group: ProductGroup;
  specLocked: boolean;
  focusMeasurements: boolean;
  openSection: MeasurementFormSectionStep | null;
  section1Summary?: string;
  setSectionOpen: (step: 1 | 2 | 3) => (open: boolean) => void;
  onUpdateGroupType: (id: number, type: ProductType) => void;
  onUpdateGroupDetails: (id: number, field: string, value: string) => void;
}) {
  if (!specLocked) {
    return (
      <MeasurementFormSection
        step={1}
        title="Produto"
        description="Nome para reconhecer na obra e tipo de estore ou toldo."
        summary={section1Summary}
        collapsible={focusMeasurements}
        open={focusMeasurements ? openSection === 1 : true}
        onOpenChange={setSectionOpen(1)}
      >
        <div className="space-y-1">
          <label
            htmlFor={measurementGroupFieldId(group.id, "customName")}
            className="text-xs font-black text-muted-foreground uppercase tracking-widest px-1"
          >
            Nome personalizado
          </label>
          <input
            id={measurementGroupFieldId(group.id, "customName")}
            type="text"
            placeholder="Ex.: quarto do fundo, varanda…"
            className="w-full min-h-12 bg-card border-2 border-border rounded-xl p-3 text-sm font-bold text-foreground focus:border-info-solid outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
            value={group.details.customName ?? ""}
            onChange={(e) => onUpdateGroupDetails(group.id, "customName", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <span className="text-xs font-black text-muted-foreground uppercase tracking-widest px-1">
            Tipo de produto
          </span>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4">
            {PRODUCT_TYPE_OPTIONS.map((type) => (
              <button
                key={type.id}
                type="button"
                onClick={() => onUpdateGroupType(group.id, type.id)}
                className={`flex min-h-12 items-center gap-2 rounded-xl border-2 p-2.5 text-xs font-black uppercase transition-all ${
                  group.type === type.id
                    ? "bg-ink border-border text-ink-foreground shadow-lg"
                    : "bg-card border-border text-muted-foreground hover:border-border"
                }`}
              >
                <Box className="h-4 w-4 shrink-0" aria-hidden /> {type.label}
              </button>
            ))}
          </div>
        </div>
      </MeasurementFormSection>
    );
  }

  return (
    <div className="space-y-1">
      <label className="text-xs font-black text-muted-foreground uppercase tracking-widest px-1">
        Nome personalizado
      </label>
      <div className="text-sm font-black text-foreground border-b border-border pb-2 px-1">
        {group.details.customName?.trim() || "—"}
      </div>
    </div>
  );
}