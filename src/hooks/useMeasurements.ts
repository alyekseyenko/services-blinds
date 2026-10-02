import { useState, useEffect, useRef } from "react";
import { ProductGroup, ProductType, Task } from "@/types";
import { parseMeasurementsFromReport } from "@/lib/measurementsUtils";
import { isOnboardingDemoEntity, ONBOARDING_DEMO_OPP_ID } from "@/lib/onboarding/demoMapPin";
import { ONBOARDING_SEED_MEASUREMENTS_EVENT } from "@/lib/onboarding/demoMeasurementsSeed";
import { isBrowserOnline } from "@/lib/networkOnline";
import { getServiceItemsByOpportunityAction } from "@/actions/measurements-actions";

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
  measurements: [{ qty: 1, width: "", height: "", fixation: "", controls: "", notes: "", price: "" }],
  isOpen: true,
});

function parseAndGroupServiceItems(items: Array<Record<string, unknown>>): ProductGroup[] {
  const parseItemDeServico = (item: Record<string, unknown>) => {
    const loc = String(item.localizacao || "");
    const colorStr = String(item.cor || "");

    const getField = (pattern: RegExp) => {
      const match = loc.match(pattern);
      return match ? match[1].trim() : "";
    };
    const notes = getField(/Local:\s*([^|]+)/) || getField(/Notas:\s*([^|]+)/);
    const fixation = getField(/Fixação:\s*([^|]+)/);
    const controls = getField(/Comandos:\s*([^|]+)/);
    const material = getField(/Mat:\s*([^|]+)/);
    const model = getField(/Mod:\s*([^|]+)/);
    const activation = getField(/Acion:\s*([^|]+)/);
    const observations = getField(/Obs:\s*([^|]+)/);

    const getCorField = (pattern: RegExp) => {
      const match = colorStr.match(pattern);
      return match ? match[1].trim() : "";
    };
    const ral =
      getCorField(/RAL\s*([^/]+)/) ||
      (colorStr.includes("RAL") ? colorStr.split("RAL")[1].split("/")[0].trim() : "");
    const fabric = getCorField(/Tec:\s*([^/]+)/);
    const reference = getCorField(/Ref:\s*([^/]+)/);

    return {
      qty: Number(item.quantidade) || 1,
      width: item.largura ? String(item.largura) : "",
      height: item.altura ? String(item.altura) : "",
      fixation,
      controls,
      notes,
      price: "",
      type: item.produto as ProductType,
      material: material || "",
      ral: ral || colorStr || "",
      activation: activation || "",
      model: model || "",
      fabric: fabric || "",
      reference: reference || "",
      observations: observations || "",
    };
  };

  const groupsMap: Record<string, ProductGroup> = {};

  items.forEach((item) => {
    const parsed = parseItemDeServico(item);
    const key = `${parsed.type}_${parsed.material}_${parsed.ral}_${parsed.activation}_${parsed.model}_${parsed.fabric}_${parsed.reference}_${parsed.observations}`;

    if (!groupsMap[key]) {
      groupsMap[key] = {
        id: Date.now() + Math.random(),
        type: parsed.type,
        details: {
          material: parsed.material,
          otherMaterial: "",
          ral: parsed.ral,
          activation: parsed.activation,
          model: parsed.model,
          fabric: parsed.fabric,
          reference: parsed.reference,
          observations: parsed.observations,
        },
        measurements: [],
        isOpen: false,
      };
    }

    groupsMap[key].measurements.push({
      qty: parsed.qty,
      width: parsed.width,
      height: parsed.height,
      fixation: parsed.fixation,
      controls: parsed.controls,
      notes: parsed.notes,
      price: "",
    });
  });

  const result = Object.values(groupsMap);
  if (result.length > 0) {
    result[0].isOpen = true;
  }
  return result;
}

export function useMeasurements(task?: Task, opportunityId?: string) {
  const [productGroups, setProductGroups] = useState<ProductGroup[]>([DEFAULT_GROUP()]);
  const [lastLocalSave, setLastLocalSave] = useState<string | null>(null);
  const userEditedRef = useRef(false);

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
  const DRAFT_KEY = `measurements_draft_${taskId || "new"}${oppKey ? `_${oppKey}` : ""}`;

  useEffect(() => {
    userEditedRef.current = false;
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
          const res = await getServiceItemsByOpportunityAction(loadOppId, taskId);
          if (cancelled) return;
          if (res.success && res.data && res.data.length > 0) {
            const mappedGroups = parseAndGroupServiceItems(res.data as Array<Record<string, unknown>>);
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
      const parsedReport = parseMeasurementsFromReport(reportForParse);
      if (parsedReport?.groups) {
        setProductGroups(
          parsedReport.groups.map((g, index) => {
            const legacy = g as unknown as Partial<ProductGroup>;
            return {
              id: legacy.id ?? Date.now() + index,
              type: (legacy.type as ProductType) || "ESTORE_EXTERIOR",
              details: legacy.details ?? DEFAULT_GROUP().details,
              measurements: g.measurements.map((m) => ({
                qty: m.qty,
                width: String(m.width ?? ""),
                height: String(m.height ?? ""),
                fixation: m.fixation ?? "",
                controls: m.controls ?? "",
                notes: m.notes ?? "",
                price: "",
              })),
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
  }, [taskId, oppKey, opportunityId, DRAFT_KEY, reportForParse]);

  useEffect(() => {
    const reloadDraft = () => {
      const savedDraft = localStorage.getItem(DRAFT_KEY);
      if (!savedDraft) return;
      try {
        const draftData = JSON.parse(savedDraft) as { groups?: ProductGroup[] };
        if (draftData.groups) setProductGroups(draftData.groups);
      } catch {
        /* ignore */
      }
    };
    window.addEventListener(ONBOARDING_SEED_MEASUREMENTS_EVENT, reloadDraft);
    return () => window.removeEventListener(ONBOARDING_SEED_MEASUREMENTS_EVENT, reloadDraft);
  }, [DRAFT_KEY]);

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
    localStorage.removeItem(DRAFT_KEY + "_saved");
  };

  const addGroup = () => {
    markAsDirty();
    setProductGroups((prev) => [
      ...prev.map((g) => ({ ...g, isOpen: false })),
      DEFAULT_GROUP(),
    ]);
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

  const updateGroupType = (groupId: number, type: ProductType) => {
    markAsDirty();
    setProductGroups((prev) => prev.map((g) => (g.id === groupId ? { ...g, type } : g)));
  };

  const updateGroupDetails = (groupId: number, field: string, value: string) => {
    markAsDirty();
    setProductGroups((prev) =>
      prev.map((g) =>
        g.id === groupId ? { ...g, details: { ...g.details, [field]: value } } : g
      )
    );
  };

  const cloneRow = (groupId: number, row: ProductGroup["measurements"][number]) => {
    markAsDirty();
    setProductGroups((prev) =>
      prev.map((g) =>
        g.id === groupId
          ? { ...g, measurements: [...g.measurements, { ...JSON.parse(JSON.stringify(row)) }] }
          : g
      )
    );
  };

  const addRow = (groupId: number) => {
    markAsDirty();
    setProductGroups((prev) =>
      prev.map((g) =>
        g.id === groupId
          ? {
              ...g,
              measurements: [
                ...g.measurements,
                { qty: 1, width: "", height: "", fixation: "", controls: "", notes: "", price: "" },
              ],
            }
          : g
      )
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
        return { ...g, measurements: newMeasures };
      })
    );
  };

  const clearDraft = () => {
    localStorage.removeItem(DRAFT_KEY);
    localStorage.setItem(DRAFT_KEY + "_saved", "true");
  };

  return {
    productGroups,
    lastLocalSave,
    DRAFT_KEY,
    addGroup,
    cloneGroup,
    removeGroup,
    toggleGroup,
    updateGroupType,
    updateGroupDetails,
    cloneRow,
    addRow,
    removeRow,
    updateMeasurement,
    clearDraft,
    setLastLocalSave,
  };
}
