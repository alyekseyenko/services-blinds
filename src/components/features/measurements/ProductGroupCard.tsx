"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";
import { useMeasurementsCompactSections } from "@/hooks/useMeasurementsLayout";
import type { ProductGroup, ProductType } from "@/types";
import type { MeasurementRow } from "@/types";
import {
  groupHasSpecCompletenessWarnings,
  summarizeMeasurementGroupCompleteness,
} from "@/lib/measurementCompleteness";
import { MeasurementTable } from "./MeasurementTable";
import { MeasurementFormSection } from "./MeasurementFormSection";
import {
  measurementMaterialSectionStatus,
  measurementMaterialSectionSummary,
  measurementProductSectionShouldDefaultOpen,
  measurementProductSectionSummary,
  measurementWindowsSectionMeta,
  nextExclusiveSection,
  type MeasurementFormSectionStep,
} from "@/lib/measurements/groupFormSectionMeta";
import { cn } from "@/lib/cn";
import { ProductGroupCardHeader } from "@/components/features/measurements/group/ProductGroupCardHeader";
import { ProductIdentitySection } from "@/components/features/measurements/group/ProductIdentitySection";
import { ProductGroupSpecsSection } from "@/components/features/measurements/group/ProductGroupSpecsSection";

export interface ProductGroupCardProps {
  group: ProductGroup;
  gIdx: number;
  isAdmin: boolean;
  readOnly?: boolean;
  onToggleGroup: (id: number) => void;
  onCloneGroup: (group: ProductGroup) => void;
  onRemoveGroup: (id: number) => void;
  onUpdateGroupType: (id: number, type: ProductType) => void;
  onUpdateGroupDetails: (id: number, field: string, value: string) => void;
  onUpdateMeasurement: (id: number, rowIndex: number, field: string, value: string) => void;
  onCloneRow: (id: number, row: MeasurementRow) => void;
  onAddRow: (id: number) => void;
  onRemoveRow: (id: number, rowIndex: number) => void;
  voiceObservationsTourAnchor?: boolean;
}

function ProductGroupCardComponent({
  group,
  gIdx,
  isAdmin,
  readOnly = false,
  onToggleGroup,
  onCloneGroup,
  onRemoveGroup,
  onUpdateGroupType,
  onUpdateGroupDetails,
  onUpdateMeasurement,
  onCloneRow,
  onAddRow,
  onRemoveRow,
  voiceObservationsTourAnchor = false,
}: ProductGroupCardProps) {
  const specLocked = isAdmin || readOnly;
  const focusMeasurements = useMeasurementsCompactSections(!specLocked);
  const [openSection, setOpenSection] = useState<MeasurementFormSectionStep | null>(() =>
    focusMeasurements && measurementProductSectionShouldDefaultOpen(group) ? 1 : 3
  );
  const autoSpecsOpenedRef = useRef(false);
  const autoProductCollapsedRef = useRef(false);

  const setSectionOpen = (step: MeasurementFormSectionStep) => (open: boolean) => {
    setOpenSection((current) => nextExclusiveSection(current, step, open));
  };

  useEffect(() => {
    if (autoSpecsOpenedRef.current || !focusMeasurements) return;
    if (groupHasSpecCompletenessWarnings(group)) {
      setOpenSection(2);
      autoSpecsOpenedRef.current = true;
    }
  }, [focusMeasurements, group]);

  useEffect(() => {
    if (!focusMeasurements || autoProductCollapsedRef.current) return;
    if (!measurementProductSectionShouldDefaultOpen(group)) {
      setOpenSection((current) => (current === 1 ? 3 : current));
      autoProductCollapsedRef.current = true;
    }
  }, [focusMeasurements, group]);

  const completenessHints = useMemo(
    () => (!specLocked ? summarizeMeasurementGroupCompleteness(group) : []),
    [group, specLocked]
  );

  const section1Summary = useMemo(
    () => (!specLocked ? measurementProductSectionSummary(group) : undefined),
    [group, specLocked]
  );
  const section2Summary = useMemo(
    () => (!specLocked ? measurementMaterialSectionSummary(group) : undefined),
    [group, specLocked]
  );
  const section2Status = useMemo(
    () => (!specLocked ? measurementMaterialSectionStatus(group) : undefined),
    [group, specLocked]
  );
  const section3Meta = useMemo(
    () => (!specLocked ? measurementWindowsSectionMeta(group) : undefined),
    [group, specLocked]
  );

  const hasWarnings =
    !specLocked &&
    (completenessHints.length > 0 || groupHasSpecCompletenessWarnings(group));

  return (
    <div
      className={cn(
        "overflow-hidden rounded-3xl border-2 bg-card transition-shadow",
        group.isOpen
          ? "border-border-strong shadow-sm"
          : cn(
              "shadow-md ring-2 ring-border-strong/25",
              hasWarnings ? "border-warning-border ring-warning-border/20" : "border-border-strong"
            )
      )}
    >
      <ProductGroupCardHeader
        group={group}
        gIdx={gIdx}
        specLocked={specLocked}
        completenessHints={completenessHints}
        onToggleGroup={onToggleGroup}
        onCloneGroup={onCloneGroup}
        onRemoveGroup={onRemoveGroup}
      />

      {group.isOpen && (
        <div
          className={`${specLocked ? "space-y-8 p-6" : "space-y-4 p-4 md:p-5 lg:space-y-6 lg:p-6"} animate-in slide-in-from-top-2 duration-300`}
        >
          <ProductIdentitySection
            group={group}
            specLocked={specLocked}
            focusMeasurements={focusMeasurements}
            openSection={openSection}
            section1Summary={section1Summary}
            setSectionOpen={setSectionOpen}
            onUpdateGroupType={onUpdateGroupType}
            onUpdateGroupDetails={onUpdateGroupDetails}
          />

          <ProductGroupSpecsSection
            group={group}
            specLocked={specLocked}
            focusMeasurements={focusMeasurements}
            openSection={openSection}
            section2Summary={section2Summary}
            section2Status={section2Status}
            setSectionOpen={setSectionOpen}
            onUpdateGroupDetails={onUpdateGroupDetails}
            voiceObservationsTourAnchor={voiceObservationsTourAnchor}
          />

          <MeasurementFormSection
            step={3}
            enabled={!specLocked}
            title="Janelas"
            description="Uma linha por vão: medidas, divisão e extras de cada estore."
            summary={section3Meta?.summary}
            statusBadge={section3Meta?.statusBadge}
            collapsible={focusMeasurements}
            open={focusMeasurements ? openSection === 3 : true}
            onOpenChange={setSectionOpen(3)}
          >
            <MeasurementTable
              group={group}
              isAdmin={isAdmin}
              readOnly={readOnly}
              showPriceColumn={isAdmin}
              onUpdateMeasurement={onUpdateMeasurement}
              onCloneRow={onCloneRow}
              onAddRow={onAddRow}
              onRemoveRow={onRemoveRow}
            />
          </MeasurementFormSection>
        </div>
      )}
    </div>
  );
}

export const ProductGroupCard = memo(ProductGroupCardComponent);