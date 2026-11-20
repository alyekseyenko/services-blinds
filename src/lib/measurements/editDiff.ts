import type { MeasurementsPayload } from "@/lib/schemas";

const DETAIL_LABELS: Record<string, string> = {
  material: "Material",
  otherMaterial: "Outro material",
  ral: "RAL / cor",
  activation: "Acionamento",
  model: "Modelo",
  fabric: "Tecido",
  reference: "Referência",
  observations: "Observações",
  customName: "Nome",
  exteriorInstallType: "Montagem",
  remeasureNeeded: "Medidas retificadas",
  remeasureNote: "Nota da retificação",
};

const LINE_LABELS: Record<string, string> = {
  qty: "Quantidade",
  width: "Largura",
  height: "Altura",
  openingWidth: "Largura do vão",
  openingHeight: "Altura do vão",
  fixation: "Fixação",
  controls: "Comandos",
  notes: "Divisão",
  lineNotes: "Notas da linha",
  divisionCustom: "Divisão (texto)",
  fixationCustom: "Fixação (texto)",
  controlsCustom: "Comandos (texto)",
};

function shown(value: unknown): string {
  if (value == null) return "—";
  const text = String(value).trim();
  return text || "—";
}

function changed(before: unknown, after: unknown): boolean {
  return shown(before) !== shown(after);
}

export function describeMeasurementEdits(
  before: MeasurementsPayload | null | undefined,
  after: MeasurementsPayload
): string[] {
  const lines: string[] = [];
  const previous = before?.groups ?? [];
  const next = after.groups ?? [];
  const count = Math.max(previous.length, next.length);

  for (let gi = 0; gi < count; gi += 1) {
    const oldGroup = previous[gi];
    const newGroup = next[gi];
    const product = `Produto ${gi + 1}`;
    if (!oldGroup && newGroup) {
      lines.push(`${product}: adicionado (${newGroup.type}).`);
      continue;
    }
    if (oldGroup && !newGroup) {
      lines.push(`${product}: removido.`);
      continue;
    }
    if (!oldGroup || !newGroup) continue;
    if (changed(oldGroup.type, newGroup.type)) {
      lines.push(`${product}: tipo ${shown(oldGroup.type)} → ${shown(newGroup.type)}.`);
    }
    for (const key of Object.keys(DETAIL_LABELS)) {
      const prev = (oldGroup.details as Record<string, unknown> | undefined)?.[key];
      const curr = (newGroup.details as Record<string, unknown> | undefined)?.[key];
      if (changed(prev, curr)) {
        lines.push(`${product}, ${DETAIL_LABELS[key]}: ${shown(prev)} → ${shown(curr)}.`);
      }
    }
    const oldLines = oldGroup.measurements ?? [];
    const newLines = newGroup.measurements ?? [];
    const lineCount = Math.max(oldLines.length, newLines.length);
    for (let li = 0; li < lineCount; li += 1) {
      const oldLine = oldLines[li] as Record<string, unknown> | undefined;
      const newLine = newLines[li] as Record<string, unknown> | undefined;
      const where = `${product}, linha ${li + 1}`;
      if (!oldLine && newLine) {
        lines.push(`${where}: adicionada.`);
        continue;
      }
      if (oldLine && !newLine) {
        lines.push(`${where}: removida.`);
        continue;
      }
      if (!oldLine || !newLine) continue;
      for (const key of Object.keys(LINE_LABELS)) {
        if (changed(oldLine[key], newLine[key])) {
          lines.push(`${where}, ${LINE_LABELS[key]}: ${shown(oldLine[key])} → ${shown(newLine[key])}.`);
        }
      }
    }
  }

  return lines;
}
