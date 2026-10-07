import type { MeasurementsPayload } from "@/lib/schemas";
import type { ProductGroup, ProductGroupDetails, ProductType } from "@/types";
import {
  productTypeUsesExteriorMaterial,
  sanitizeGroupDetailsForType,
} from "@/lib/measurementProductDetails";
import { pickGroupExtras } from "@/lib/measurements/extendedFields";
import {
  emptyMeasurementRow,
  hydrateMeasurementRowFromLegacy,
  syncMeasurementRowLegacyFields,
} from "@/lib/measurements/rowPayload";

const JSON_MEASUREMENTS_REGEX = /<!--\s*\[JSON_MEASUREMENTS\](.*?)\s*-->/;

export function parseMeasurementsFromReport(report?: string | null): MeasurementsPayload | null {
  if (!report) return null;

  const commentMatch = report.match(JSON_MEASUREMENTS_REGEX);
  if (commentMatch?.[1]) {
    try {
      const data = JSON.parse(commentMatch[1]);
      if (Array.isArray(data?.groups)) return data as MeasurementsPayload;
    } catch {
      // fall through
    }
  }

  if (report.includes("[MEASUREMENTS]")) {
    try {
      const jsonPart = report.split("[MEASUREMENTS]")[1];
      const data = JSON.parse(jsonPart);
      if (Array.isArray(data?.groups)) return data as MeasurementsPayload;
    } catch {
      // ignore legacy format
    }
  }

  return null;
}

export function hasValidMeasurements(
  report?: string | null,
  draftJson?: string | null
): boolean {
  const fromReport = parseMeasurementsFromReport(report);
  if (fromReport?.groups?.some((g) => g.measurements?.some((m) => m.width && m.height))) {
    return true;
  }

  if (draftJson) {
    try {
      const draft = JSON.parse(draftJson);
      if (draft?.groups?.some((g: { measurements?: Array<{ width?: string; height?: string }> }) =>
        g.measurements?.some((m) => m.width && m.height)
      )) {
        return true;
      }
    } catch {
      // ignore
    }
  }

  return false;
}

export function formatMeasurementsReport(data: MeasurementsPayload): string {
  return `<!-- [JSON_MEASUREMENTS]${JSON.stringify(data)} -->`;
}

export function getMeasurementsDraftKey(taskId: string, opportunityId?: string): string {
  if (opportunityId) return `measurements_draft_${taskId}_${opportunityId}`;
  return `measurements_draft_${taskId}`;
}

function readStringField(item: Record<string, unknown>, key: string): string {
  const v = item[key];
  if (v == null) return "";
  return String(v).trim();
}

function hasStructuredMeasurementFields(item: Record<string, unknown>): boolean {
  return Boolean(
    readStringField(item, "grupoMedicaoId") ||
      readStringField(item, "divisao") ||
      readStringField(item, "material") ||
      readStringField(item, "modelo")
  );
}

export function parseAndGroupServiceItems(items: Array<Record<string, unknown>>): ProductGroup[] {
  const parseItemDeServico = (item: Record<string, unknown>) => {
    const structured = hasStructuredMeasurementFields(item);
    const loc = String(item.localizacao || "");
    const colorStr = String(item.cor || "");

    const getField = (pattern: RegExp) => {
      const match = loc.match(pattern);
      return match ? match[1].trim() : "";
    };

    const notes =
      readStringField(item, "divisao") ||
      getField(/Local:\s*([^|]+)/) ||
      getField(/Notas:\s*([^|]+)/);
    const fixation = readStringField(item, "fixacao") || getField(/Fixação:\s*([^|]+)/);
    const controls = readStringField(item, "comandos") || getField(/Comandos:\s*([^|]+)/);

    const productType = String(item.produto || "");
    const usesExteriorMaterial = productTypeUsesExteriorMaterial(productType);

    const materialRaw = usesExteriorMaterial ? readStringField(item, "material") : "";
    const materialOther = usesExteriorMaterial ? readStringField(item, "materialOutro") : "";
    const materialFromLoc = usesExteriorMaterial ? getField(/Mat:\s*([^|]+)/) : "";
    const material =
      materialRaw ||
      (materialFromLoc && !structured ? materialFromLoc : "");

    const model = readStringField(item, "modelo") || getField(/Mod:\s*([^|]+)/);
    const activation =
      readStringField(item, "acionamento") || getField(/Acion:\s*([^|]+)/);
    const observations =
      readStringField(item, "observacoesProduto") || getField(/Obs:\s*([^|]+)/);

    const getCorField = (pattern: RegExp) => {
      const match = colorStr.match(pattern);
      return match ? match[1].trim() : "";
    };
    const ral =
      readStringField(item, "ralCor") ||
      getCorField(/RAL\s*([^/]+)/) ||
      (colorStr.includes("RAL") ? colorStr.split("RAL")[1].split("/")[0].trim() : "");
    const fabric = readStringField(item, "tecido") || getCorField(/Tec:\s*([^/]+)/);
    const reference = readStringField(item, "referencia") || getCorField(/Ref:\s*([^/]+)/);

    const priceVal = item.preco;
    const price =
      priceVal != null && priceVal !== "" && Number.isFinite(Number(priceVal))
        ? String(priceVal)
        : "";

    let materialCode = material;
    let otherMaterial = "";
    if (materialRaw === "OUTRO") {
      materialCode = "OUTRO";
      otherMaterial = materialOther;
    } else if (!materialRaw && materialFromLoc && materialFromLoc !== "Outro") {
      materialCode = materialFromLoc;
    } else if (!materialRaw && materialFromLoc === "Outro") {
      materialCode = "OUTRO";
      otherMaterial = materialOther || materialFromLoc;
    }

    const groupId = readStringField(item, "grupoMedicaoId");

    return {
      qty: Number(item.quantidade) || 1,
      width: item.largura ? String(item.largura) : "",
      height: item.altura ? String(item.altura) : "",
      fixation,
      controls,
      notes,
      price,
      type: item.produto as ProductType,
      material: materialCode || "",
      otherMaterial,
      ral: ral || (!structured && colorStr ? colorStr : ""),
      activation: activation || "",
      model: model || "",
      fabric: fabric || "",
      reference: reference || "",
      observations: observations || "",
      groupId,
    };
  };

  const groupsMap: Record<string, ProductGroup> = {};

  items.forEach((item) => {
    const parsed = parseItemDeServico(item);
    const key =
      parsed.groupId ||
      `${parsed.type}_${parsed.material}_${parsed.otherMaterial}_${parsed.ral}_${parsed.activation}_${parsed.model}_${parsed.fabric}_${parsed.reference}_${parsed.observations}`;

    if (!groupsMap[key]) {
      groupsMap[key] = {
        id: Date.now() + Math.random(),
        type: parsed.type,
        details: sanitizeGroupDetailsForType(parsed.type, {
          material: parsed.material,
          otherMaterial: parsed.otherMaterial,
          ral: parsed.ral,
          activation: parsed.activation,
          model: parsed.model,
          fabric: parsed.fabric,
          reference: parsed.reference,
          observations: parsed.observations,
        }),
        measurements: [],
        isOpen: false,
      };
    }

    groupsMap[key].measurements.push(
      hydrateMeasurementRowFromLegacy({
        qty: parsed.qty,
        width: parsed.width,
        height: parsed.height,
        fixation: parsed.fixation,
        controls: parsed.controls,
        notes: parsed.notes,
        price: parsed.price,
      })
    );
  });

  const result = Object.values(groupsMap);
  if (result.length > 0) {
    result[0].isOpen = true;
  }
  return result;
}

export function productGroupsToMeasurementsPayload(groups: ProductGroup[]): MeasurementsPayload {
  return {
    groups: groups.map((g) => ({
      type: g.type,
      details: {
        ...sanitizeGroupDetailsForType(g.type, g.details as ProductGroupDetails),
        ...pickGroupExtras(g.details as unknown as Record<string, unknown>),
      },
      measurements: g.measurements.map((m) => {
        const synced = syncMeasurementRowLegacyFields(m);
        return {
          qty: Number(synced.qty) || 0,
          width: Number.parseInt(String(synced.width), 10) || 0,
          height: Number.parseInt(String(synced.height), 10) || 0,
          notes: synced.notes,
          fixation: synced.fixation,
          controls: synced.controls,
          price: synced.price,
          divisionCode: synced.divisionCode,
          divisionCustom: synced.divisionCustom,
          fixationCodes: synced.fixationCodes,
          fixationCustom: synced.fixationCustom,
          controlsCodes: synced.controlsCodes,
          controlsCustom: synced.controlsCustom,
          openingWidth: synced.openingWidth,
          openingHeight: synced.openingHeight,
          lineCollapsed: synced.lineCollapsed,
          lineNotes: synced.lineNotes,
        };
      }),
    })),
  };
}

export function measurementsPayloadToProductGroups(payload: MeasurementsPayload): ProductGroup[] {
  const groups = payload.groups.map((g, index) => ({
    id: Date.now() + index,
    type: g.type as ProductGroup["type"],
    details: sanitizeGroupDetailsForType(g.type as ProductType, {
      material: g.details?.material ?? "",
      otherMaterial: g.details?.otherMaterial ?? "",
      ral: g.details?.ral ?? "",
      activation: g.details?.activation ?? "",
      model: g.details?.model ?? "",
      fabric: g.details?.fabric ?? "",
      reference: g.details?.reference ?? "",
      observations: g.details?.observations ?? "",
      ...pickGroupExtras((g.details ?? {}) as Record<string, unknown>),
    }),
    measurements: g.measurements.map((m) =>
      hydrateMeasurementRowFromLegacy({
        qty: m.qty,
        width: String(m.width ?? ""),
        height: String(m.height ?? ""),
        fixation: m.fixation ?? "",
        controls: m.controls ?? "",
        notes: m.notes ?? "",
        price: String(m.price ?? ""),
        divisionCode: (m as { divisionCode?: string }).divisionCode,
        divisionCustom: (m as { divisionCustom?: string }).divisionCustom,
        fixationCodes: (m as { fixationCodes?: string }).fixationCodes,
        fixationCustom: (m as { fixationCustom?: string }).fixationCustom,
        controlsCodes: (m as { controlsCodes?: string }).controlsCodes,
        controlsCustom: (m as { controlsCustom?: string }).controlsCustom,
        openingWidth: (m as { openingWidth?: string }).openingWidth,
        openingHeight: (m as { openingHeight?: string }).openingHeight,
        lineCollapsed: (m as { lineCollapsed?: string }).lineCollapsed,
        lineNotes: (m as { lineNotes?: string }).lineNotes,
      })
    ),
    isOpen: index === 0,
  }));
  return groups;
}
