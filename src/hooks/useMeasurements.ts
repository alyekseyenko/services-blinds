import { useState, useEffect } from "react";
import { ProductGroup, ProductType, Task } from "@/types";
import { parseMeasurementsFromReport } from "@/lib/measurementsUtils";

export function useMeasurements(task?: Task, opportunityId?: string) {
  const [productGroups, setProductGroups] = useState<ProductGroup[]>([
    {
      id: Date.now(),
      type: "ESTORE_EXTERIOR",
      details: { material: "", otherMaterial: "", ral: "", activation: "", model: "", fabric: "", reference: "", observations: "" },
      measurements: [{ qty: 1, width: "", height: "", fixation: "", controls: "", notes: "", price: "" }],
      isOpen: true
    }
  ]);
  const [lastLocalSave, setLastLocalSave] = useState<string | null>(null);

  const oppKey = opportunityId || task?.opportunityId;
  const DRAFT_KEY = `measurements_draft_${task?.id || "new"}${oppKey ? `_${oppKey}` : ""}`;

  useEffect(() => {
    const savedDraft = localStorage.getItem(DRAFT_KEY);
    if (savedDraft) {
      try {
        const draftData = JSON.parse(savedDraft);
        setProductGroups(draftData.groups);
        return;
      } catch (e) {
        console.error("Error parsing draft:", e);
      }
    }

    function parseAndGroupServiceItems(items: any[]): ProductGroup[] {
      const parseItemDeServico = (item: any) => {
        const loc = item.localizacao || "";
        const colorStr = item.cor || "";
        
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
        const ral = getCorField(/RAL\s*([^/]+)/) || (colorStr.includes('RAL') ? colorStr.split('RAL')[1].split('/')[0].trim() : "");
        const fabric = getCorField(/Tec:\s*([^/]+)/);
        const reference = getCorField(/Ref:\s*([^/]+)/);

        return {
          qty: item.quantidade || 1,
          width: item.largura ? item.largura.toString() : "",
          height: item.altura ? item.altura.toString() : "",
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
          observations: observations || ""
        };
      };

      const groupsMap: { [key: string]: ProductGroup } = {};
      
      items.forEach(item => {
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
              observations: parsed.observations
            },
            measurements: [],
            isOpen: false
          };
        }
        
        groupsMap[key].measurements.push({
          qty: parsed.qty,
          width: parsed.width,
          height: parsed.height,
          fixation: parsed.fixation,
          controls: parsed.controls,
          notes: parsed.notes,
          price: ""
        });
      });
      
      const result = Object.values(groupsMap);
      if (result.length > 0) {
        result[0].isOpen = true;
      }
      return result;
    }

    async function loadFromCrm() {
      // 1. Tentar ler os itens reais de serviço diretamente do CRM primeiro!
      const loadOppId = opportunityId || task?.opportunityId;
      if (loadOppId) {
        try {
          const { getServiceItemsByOpportunityAction } = await import("@/actions/measurements-actions");
          const res = await getServiceItemsByOpportunityAction(loadOppId, task?.id);
          if (res.success && res.data && res.data.length > 0) {
            console.log(`[useMeasurements] Encontrados ${res.data.length} itens reais de serviço no CRM.`);
            const mappedGroups = parseAndGroupServiceItems(res.data);
            if (mappedGroups.length > 0) {
              setProductGroups(mappedGroups);
              return;
            }
          }
        } catch (e) {
          console.error("Error loading structured items from CRM:", e);
        }
      }

      const parsedReport = parseMeasurementsFromReport(task?.report);
      if (parsedReport?.groups) {
        setProductGroups(
          parsedReport.groups.map((g, index) => {
            const legacy = g as unknown as Partial<ProductGroup>;
            return {
              id: legacy.id ?? Date.now() + index,
              type: (legacy.type as ProductType) || "ESTORE_EXTERIOR",
              details: legacy.details ?? {
                material: "",
                otherMaterial: "",
                ral: "",
                activation: "",
                model: "",
                fabric: "",
                reference: "",
                observations: "",
              },
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

    loadFromCrm();
  }, [task, opportunityId, DRAFT_KEY]);

  useEffect(() => {
    if (productGroups.length > 0) {
      const saveToLocal = () => {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({
          groups: productGroups,
          updatedAt: new Date().toISOString()
        }));
        setLastLocalSave(new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      };
      const timeout = setTimeout(saveToLocal, 2000);
      return () => clearTimeout(timeout);
    }
  }, [productGroups, DRAFT_KEY]);

  const markAsDirty = () => {
    localStorage.removeItem(DRAFT_KEY + "_saved");
  };

  const addGroup = () => {
    markAsDirty();
    setProductGroups([
      ...productGroups.map(g => ({ ...g, isOpen: false })),
      {
        id: Date.now(),
        type: "ESTORE_EXTERIOR",
        details: { material: "", otherMaterial: "", ral: "", activation: "", model: "", fabric: "", reference: "", observations: "" },
        measurements: [{ qty: 1, width: "", height: "", fixation: "", controls: "", notes: "", price: "" }],
        isOpen: true
      }
    ]);
  };

  const cloneGroup = (group: ProductGroup) => {
    markAsDirty();
    setProductGroups([
      ...productGroups.map(g => ({ ...g, isOpen: false })),
      {
        ...JSON.parse(JSON.stringify(group)),
        id: Date.now(),
        isOpen: true
      }
    ]);
  };

  const removeGroup = (groupId: number) => {
    if (productGroups.length > 1) {
      markAsDirty();
      setProductGroups(productGroups.filter(g => g.id !== groupId));
    }
  };

  const toggleGroup = (groupId: number) => {
    setProductGroups(productGroups.map(g => 
      g.id === groupId ? { ...g, isOpen: !g.isOpen } : g
    ));
  };

  const updateGroupType = (groupId: number, type: ProductType) => {
    markAsDirty();
    setProductGroups(productGroups.map(g => 
      g.id === groupId ? { ...g, type } : g
    ));
  };

  const updateGroupDetails = (groupId: number, field: string, value: string) => {
    markAsDirty();
    setProductGroups(productGroups.map(g => 
      g.id === groupId ? { ...g, details: { ...g.details, [field]: value } } : g
    ));
  };

  const cloneRow = (groupId: number, row: any) => {
    markAsDirty();
    setProductGroups(productGroups.map(g => 
      g.id === groupId ? { ...g, measurements: [...g.measurements, { ...JSON.parse(JSON.stringify(row)) }] } : g
    ));
  };

  const addRow = (groupId: number) => {
    markAsDirty();
    setProductGroups(productGroups.map(g => 
      g.id === groupId ? { 
        ...g, 
        measurements: [
          ...g.measurements, 
          { qty: 1, width: "", height: "", fixation: "", controls: "", notes: "", price: "" }
        ] 
      } : g
    ));
  };

  const removeRow = (groupId: number, rowIndex: number) => {
    setProductGroups(productGroups.map(g => {
      if (g.id === groupId && g.measurements.length > 1) {
        markAsDirty();
        return { ...g, measurements: g.measurements.filter((_, i) => i !== rowIndex) };
      }
      return g;
    }));
  };

  const updateMeasurement = (groupId: number, rowIndex: number, field: string, value: string) => {
    setProductGroups(productGroups.map(g => {
      if (g.id === groupId) {
        markAsDirty();
        const newMeasures = [...g.measurements];
        (newMeasures[rowIndex] as any)[field] = value;
        return { ...g, measurements: newMeasures };
      }
      return g;
    }));
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
    setLastLocalSave
  };
}
