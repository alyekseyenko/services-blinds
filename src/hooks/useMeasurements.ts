import { useState, useEffect, useRef, useCallback } from "react";
import { ProductGroup, ProductType, Task } from "@/types";
import { parseMeasurementsFromReport } from "@/lib/measurementsUtils";
import { isOnboardingDemoEntity, ONBOARDING_DEMO_OPP_ID } from "@/lib/demo/demoIds";
import { hapticMeasurementCaptured } from "@/lib/haptics";
import { isBrowserOnline } from "@/lib/networkOnline";
import { getMeasurementsPayloadForOpportunityAction } from "@/actions/measurements-actions";
import { measurementsPayloadToProductGroups } from "@/lib/measurementsUtils";
import {
  sanitizeGroupDetailsForType,
  sanitizeGroupDetailsOnProductTypeChange,
} from "@/lib/measurementProductDetails";
import { emptyMeasurementRow, hydrateMeasurementRowFromLegacy } from "@/lib/measurements/rowPayload";
import { isMeasurementRowComplete } from "@/lib/measurementCompleteness";
import { lineDimensionMode } from "@/lib/measurements/lineModes";
import { getRtsCommandSpecs, sanitizeRowRtsAssignment } from "@/lib/measurements/rtsCommands";
import { getNextAvailableRtsAssignment } from "@/lib/measurements/rtsChannelUsage";
import type { MeasurementsPayload } from "@/lib/schemas";

const DEFAULT_GROUP = (): ProductGroup => ({
  id: Date.now(),
  type: "ESTORE_EXTERIOR",
  details: {
    material: "",
    otherMaterial: "",
    ral: "",
    activation: "",
    model: "",
    fabric: "",
    reference: "",
    observations: "",
  },
  measurements: [emptyMeasurementRow()],
  isOpen: true,
});

export function useMeasurements(
  task?: Task,
  opportunityId?: string,
  seedPayload?: MeasurementsPayload | null
) {
  const [productGroups, setProductGroups] = useState<ProductGroup[]>([DEFAULT_GROUP()]);
  const [lastLocalSave, setLastLocalSave] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const userEditedRef = useRef(false);
  const rowDimensionHapticRef = useRef(new Map<string, boolean>());

  useEffect(() => {
    const cutoff = Date.now() - 14 * 24 * 60 * 60 * 1000;
    try {
      for (let i = localStorage.length - 1; i >= 0; i -= 1) {
        const key = localStorage.key(i);
        if (!key?.startsWith("measurements_draft_")) continue;
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const parsed = JSON.parse(raw) as { updatedAt?: string };
        if (parsed.updatedAt && new Date(parsed.updatedAt).getTime() < cutoff) {
          localStorage.removeItem(key);
        }
      }
    } catch {
      /* ignore */
    }
  }, []);

  const taskId = task?.id;
  const oppKey = opportunityId || task?.opportunityId;
  const reportForParse = task?.report;
  const reportForParseRef = useRef(reportForParse);
  reportForParseRef.current = reportForParse;
  const DRAFT_KEY = `measurements_draft_${taskId || "new"}${oppKey ? `_${oppKey}` : ""}`;

  useEffect(() => {
    if (seedPayload?.groups?.length) {
      userEditedRef.current = false;
      setIsDirty(false);
      const seeded = measurementsPayloadToProductGroups(seedPayload).map((group, index) => ({
        ...group,
        isOpen: index === 0,
      }));
      setProductGroups(seeded.length ? seeded : [DEFAULT_GROUP()]);
      return;
    }
    userEditedRef.current = false;
    setIsDirty(false);
    let cancelled = false;

    const savedDraft = localStorage.getItem(DRAFT_KEY);
    if (savedDraft) {
      try {
        const draftData = JSON.parse(savedDraft) as { groups?: ProductGroup[] };
        if (draftData.groups?.length) {
          setProductGroups(draftData.groups);
          return () => {
            cancelled = true;
          };
        }
      } catch (e) {
        console.error("Error parsing draft:", e);
      }
    }

    async function loadFromCrm() {
      const loadOppId = opportunityId || oppKey;
      if (loadOppId === ONBOARDING_DEMO_OPP_ID || isOnboardingDemoEntity(task ? { id: taskId, opportunityId: loadOppId } : null)) {
        return;
      }

      if (loadOppId && isBrowserOnline()) {
        try {
          const res = await getMeasurementsPayloadForOpportunityAction(loadOppId, taskId);
          if (cancelled) return;
          if (res.success && res.data?.groups?.length) {
            const mappedGroups = measurementsPayloadToProductGroups(res.data);
            if (mappedGroups.length > 0) {
              setProductGroups(mappedGroups);
              return;
            }
          }
        } catch (e) {
          console.error("Error loading structured items from CRM:", e);
        }
      }

      if (cancelled) return;
      const parsedReport = parseMeasurementsFromReport(reportForParseRef.current);
      if (parsedReport?.groups) {
        setProductGroups(
          parsedReport.groups.map((g, index) => {
            const legacy = g as unknown as Partial<ProductGroup>;
            return {
              id: legacy.id ?? Date.now() + index,
              type: (legacy.type as ProductType) || "ESTORE_EXTERIOR",
              details: legacy.details ?? DEFAULT_GROUP().details,
              measurements: g.measurements.map((m) =>
                hydrateMeasurementRowFromLegacy({
                  qty: m.qty,
                  width: String(m.width ?? ""),
                  height: String(m.height ?? ""),
                  fixation: m.fixation ?? "",
                  controls: m.controls ?? "",
                  notes: m.notes ?? "",
                  price: String((m as { price?: string | number }).price ?? ""),
                })
              ),
              isOpen: false,
            };
          })
        );
      }
    }

    void loadFromCrm();
    return () => {
      cancelled = true;
    };
    // reportForParse is only a fallback on first load of this visit — not after Guardar.
  }, [taskId, oppKey, opportunityId, DRAFT_KEY, seedPayload]);

  useEffect(() => {
    if (!userEditedRef.current || productGroups.length === 0) return;
    const saveToLocal = () => {
      try {
        localStorage.setItem(
          DRAFT_KEY,
          JSON.stringify({
            groups: productGroups,
            updatedAt: new Date().toISOString(),
          })
        );
        setLastLocalSave(
          new Date().toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
        );
      } catch {
        /* quota / private mode */
      }
    };
    const timeout = setTimeout(saveToLocal, 2000);
    return () => clearTimeout(timeout);
  }, [productGroups, DRAFT_KEY]);

  const markAsDirty = () => {
    userEditedRef.current = true;
    setIsDirty(true);
    localStorage.removeItem(DRAFT_KEY + "_saved");
  };

  const addGroup = () => {
    markAsDirty();
    setProductGroups((prev) => {
      const inherited = prev.find((g) => g.details.remeasureNeeded)?.details;
      const next = DEFAULT_GROUP();
      if (inherited?.remeasureNeeded) {
        next.details = {
          ...next.details,
          remeasureNeeded: inherited.remeasureNeeded,
          remeasureNote: inherited.remeasureNote ?? "",
        };
      }
      return [...prev.map((g) => ({ ...g, isOpen: false })), next];
    });
  };

  const setRemeasure = (needed: string, note?: string) => {
    markAsDirty();
    setProductGroups((prev) =>
      prev.map((g) => ({
        ...g,
        details: {
          ...g.details,
          remeasureNeeded: needed,
          remeasureNote: note ?? "",
        },
      }))
    );
  };

  const cloneGroup = (group: ProductGroup) => {
    markAsDirty();
    setProductGroups((prev) => [
      ...prev.map((g) => ({ ...g, isOpen: false })),
      {
        ...JSON.parse(JSON.stringify(group)) as ProductGroup,
        id: Date.now(),
        isOpen: true,
      },
    ]);
  };

  const removeGroup = (groupId: number) => {
    setProductGroups((prev) => {
      if (prev.length <= 1) return prev;
      markAsDirty();
      return prev.filter((g) => g.id !== groupId);
    });
  };

  const toggleGroup = (groupId: number) => {
    setProductGroups((prev) =>
      prev.map((g) => (g.id === groupId ? { ...g, isOpen: !g.isOpen } : g))
    );
  };

  const collapseAllGroups = useCallback(() => {
    setProductGroups((prev) => prev.map((g) => ({ ...g, isOpen: false })));
  }, []);

  const updateGroupType = (groupId: number, type: ProductType) => {
    markAsDirty();
    setProductGroups((prev) =>
      prev.map((g) =>
        g.id === groupId
          ? {
              ...g,
              type,
              details: sanitizeGroupDetailsOnProductTypeChange(type, g.type, g.details),
            }
          : g
      )
    );
  };

  const updateGroupDetails = (groupId: number, field: string, value: string) => {
    markAsDirty();
    setProductGroups((prev) =>
      prev.map((g) => {
        if (g.id !== groupId) return g;
        const nextDetails = { ...g.details, [field]: value };
        if (field === "rtsCommandCount" || field === "rtsCommandChannels") {
          const specs = getRtsCommandSpecs(nextDetails);
          return {
            ...g,
            details: nextDetails,
            measurements: g.measurements.map((row) => sanitizeRowRtsAssignment(row, specs)),
          };
        }
        const switchesToOpening = field === "exteriorInstallType" && value === "COMPLETO";
        if (!switchesToOpening) {
          return { ...g, details: nextDetails };
        }
        return {
          ...g,
          details: nextDetails,
          measurements: g.measurements.map((row) => {
            if (row.openingHeight?.trim() || row.openingWidth?.trim()) return row;
            if (!row.height?.trim() && !row.width?.trim()) return row;
            return {
              ...row,
              openingHeight: row.height,
              openingWidth: row.width,
              height: "",
              width: "",
            };
          }),
        };
      })
    );
  };

  const cloneRow = (groupId: number, row: ProductGroup["measurements"][number]) => {
    markAsDirty();
    setProductGroups((prev) =>
      prev.map((g) =>
        g.id === groupId
          ? {
              ...g,
              measurements: [
                ...g.measurements,
                {
                  ...(JSON.parse(JSON.stringify(row)) as typeof row),
                  lineCollapsed: "",
                },
              ],
            }
          : g
      )
    );
  };

  const addRow = (groupId: number) => {
    markAsDirty();
    setProductGroups((prev) =>
      prev.map((g) => {
        if (g.id !== groupId) return g;
        const mode = lineDimensionMode(g.type, g.details);
        const collapsedMeasurements = g.measurements.map((row) => {
          if (!isMeasurementRowComplete(row, mode)) return row;
          return { ...row, lineCollapsed: "true" };
        });
        const last = collapsedMeasurements[collapsedMeasurements.length - 1];
        let newRow = last
          ? {
              ...(JSON.parse(JSON.stringify(last)) as typeof last),
              qty: 1,
              width: "",
              height: "",
              openingWidth: "",
              openingHeight: "",
              skylightExteriorWidth: "",
              skylightExteriorHeight: "",
              depth: "",
              storeCommand: "",
              storeChannel: "",
              storeChannelOther: "",
              lineCollapsed: "",
            }
          : emptyMeasurementRow();
        if (g.details.activation === "MOTOR_RTS") {
          const specs = getRtsCommandSpecs(g.details);
          const next = getNextAvailableRtsAssignment(specs, collapsedMeasurements);
          if (next) {
            newRow = { ...newRow, storeCommand: next.storeCommand, storeChannel: next.storeChannel };
          }
        }
        return {
          ...g,
          measurements: [...collapsedMeasurements, newRow],
        };
      })
    );
  };

  const removeRow = (groupId: number, rowIndex: number) => {
    setProductGroups((prev) =>
      prev.map((g) => {
        if (g.id === groupId && g.measurements.length > 1) {
          markAsDirty();
          return { ...g, measurements: g.measurements.filter((_, i) => i !== rowIndex) };
        }
        return g;
      })
    );
  };

  const updateMeasurement = (groupId: number, rowIndex: number, field: string, value: string) => {
    setProductGroups((prev) =>
      prev.map((g) => {
        if (g.id !== groupId) return g;
        markAsDirty();
        const newMeasures = g.measurements.map((row, i) =>
          i === rowIndex ? { ...row, [field]: value } : row
        );
        if (
          field === "width" ||
          field === "height" ||
          field === "openingWidth" ||
          field === "openingHeight" ||
          field === "skylightExteriorWidth" ||
          field === "skylightExteriorHeight" ||
          field === "depth"
        ) {
          const key = `${groupId}:${rowIndex}`;
          const row = newMeasures[rowIndex];
          const complete = row
            ? isMeasurementRowComplete(row, lineDimensionMode(g.type, g.details))
            : false;
          const wasComplete = rowDimensionHapticRef.current.get(key) ?? false;
          if (complete && !wasComplete) {
            hapticMeasurementCaptured();
          }
          rowDimensionHapticRef.current.set(key, complete);
        }
        return { ...g, measurements: newMeasures };
      })
    );
  };

  const clearDraft = () => {
    localStorage.removeItem(DRAFT_KEY);
    localStorage.setItem(DRAFT_KEY + "_saved", "true");
    userEditedRef.current = false;
    setIsDirty(false);
  };

  return {
    productGroups,
    lastLocalSave,
    isDirty,
    DRAFT_KEY,
    addGroup,
    cloneGroup,
    removeGroup,
    toggleGroup,
    collapseAllGroups,
    updateGroupType,
    updateGroupDetails,
    setRemeasure,
    cloneRow,
    addRow,
    removeRow,
    updateMeasurement,
    clearDraft,
    setLastLocalSave,
  };
}
