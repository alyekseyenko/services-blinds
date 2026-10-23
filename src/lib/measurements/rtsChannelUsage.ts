import type { MeasurementRow } from "@/types";
import {
  rtsChannelOptions,
  rtsCommandMaxChannel,
  type RtsCommandSpec,
} from "@/lib/measurements/rtsCommands";

function parsePositiveInt(value: string | number | undefined): number | null {
  const n = Number.parseInt(String(value ?? "").trim(), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export type RtsChannelSlotKey = `${number}:${number}`;

export type RtsChannelUsageAnalysis = {
  totalAvailableChannels: number;
  commandCount: number;
  windowCount: number;
  totalStoreQty: number;
  /** Pares comando:canal → índices de linha (0-based). */
  slotToRowIndices: Map<RtsChannelSlotKey, number[]>;
  /** Canais distintos ocupados por comando (1-based index). */
  occupiedChannelsPerCommand: Map<number, number>;
  assignedSlotCount: number;
};

function slotKey(command: number, channel: number): RtsChannelSlotKey {
  return `${command}:${channel}`;
}

function rowAssignment(row: MeasurementRow): { command: number; channel: number } | null {
  const command = parsePositiveInt(row.storeCommand);
  const channel = parsePositiveInt(row.storeChannel);
  if (command === null || channel === null) return null;
  return { command, channel };
}

export function analyzeRtsChannelUsage(
  specs: RtsCommandSpec[],
  rows: MeasurementRow[]
): RtsChannelUsageAnalysis {
  let totalAvailableChannels = 0;
  for (const spec of specs) {
    totalAvailableChannels += rtsCommandMaxChannel(spec);
  }

  let totalStoreQty = 0;
  const slotToRowIndices = new Map<RtsChannelSlotKey, number[]>();
  const occupiedSets = new Map<number, Set<number>>();

  rows.forEach((row, rowIndex) => {
    const qty = parsePositiveInt(row.qty) ?? 1;
    totalStoreQty += qty;

    const assignment = rowAssignment(row);
    if (!assignment) return;

    const spec = specs.find((s) => s.index === assignment.command);
    const max = rtsCommandMaxChannel(spec);
    if (max === 0 || assignment.channel > max) return;

    const key = slotKey(assignment.command, assignment.channel);
    const list = slotToRowIndices.get(key) ?? [];
    list.push(rowIndex);
    slotToRowIndices.set(key, list);

    const set = occupiedSets.get(assignment.command) ?? new Set<number>();
    set.add(assignment.channel);
    occupiedSets.set(assignment.command, set);
  });

  const occupiedChannelsPerCommand = new Map<number, number>();
  for (const spec of specs) {
    occupiedChannelsPerCommand.set(spec.index, occupiedSets.get(spec.index)?.size ?? 0);
  }

  return {
    totalAvailableChannels,
    commandCount: specs.length,
    windowCount: rows.length,
    totalStoreQty,
    slotToRowIndices,
    occupiedChannelsPerCommand,
    assignedSlotCount: slotToRowIndices.size,
  };
}

function formatWindowList(indices: number[]): string {
  const labels = indices.map((i) => `Janela ${i + 1}`);
  if (labels.length === 1) return labels[0];
  if (labels.length === 2) return `${labels[0]} e ${labels[1]}`;
  return `${labels.slice(0, -1).join(", ")} e ${labels[labels.length - 1]}`;
}

export function formatRtsCommandSelectLabel(
  spec: RtsCommandSpec,
  usage: RtsChannelUsageAnalysis
): string {
  const max = rtsCommandMaxChannel(spec);
  const occupied = usage.occupiedChannelsPerCommand.get(spec.index) ?? 0;
  const base = `Comando ${spec.index}`;
  if (max === 0) return base;
  if (occupied >= max) return `${base} (${occupied}/${max} — completo)`;
  if (occupied > 0) return `${base} (${occupied}/${max} ocupados)`;
  return `${base} (${max} canais)`;
}

export function formatRtsChannelSelectLabel(
  commandIndex: number,
  channel: number,
  rowIndex: number,
  usage: RtsChannelUsageAnalysis
): string {
  const key = slotKey(commandIndex, channel);
  const indices = usage.slotToRowIndices.get(key) ?? [];
  const others = indices.filter((i) => i !== rowIndex);
  if (others.length === 0) return `Canal ${channel} (livre)`;
  return `Canal ${channel} (em uso — ${formatWindowList(others)})`;
}

export function countFreeRtsSlots(specs: RtsCommandSpec[], usage: RtsChannelUsageAnalysis): number {
  let free = 0;
  for (const spec of specs) {
    const max = rtsCommandMaxChannel(spec);
    if (max === 0) continue;
    const occupied = usage.occupiedChannelsPerCommand.get(spec.index) ?? 0;
    free += Math.max(0, max - occupied);
  }
  return free;
}

export function getRtsRowChannelWarning(
  rowIndex: number,
  row: MeasurementRow,
  specs: RtsCommandSpec[],
  usage: RtsChannelUsageAnalysis
): string | null {
  const assignment = rowAssignment(row);
  if (assignment) {
    const key = slotKey(assignment.command, assignment.channel);
    const indices = usage.slotToRowIndices.get(key) ?? [];
    const others = indices.filter((i) => i !== rowIndex);
    if (others.length > 0) {
      return `Este canal já está atribuído na ${formatWindowList(others)}.`;
    }
    return null;
  }

  if (usage.totalAvailableChannels === 0) return null;
  const free = countFreeRtsSlots(specs, usage);
  if (free === 0) {
    return "Todos os canais já estão ocupados. Adicione comandos/canais no passo 2.";
  }
  return null;
}

export function formatRtsCapacityWarningMessage(
  _specs: RtsCommandSpec[],
  usage: RtsChannelUsageAnalysis
): string | null {
  if (usage.totalAvailableChannels === 0) return null;
  const demand = usage.totalStoreQty;
  if (demand <= usage.totalAvailableChannels) return null;
  const cmdLabel =
    usage.commandCount === 1 ? "1 comando" : `${usage.commandCount} comandos`;
  return `Faltam canais RTS: tem ${demand} estores para ${usage.totalAvailableChannels} canais disponíveis (${cmdLabel}). Aumente os comandos ou canais no passo 2 «Material e detalhes», ou verifique os canais partilhados.`;
}

/** Canais válidos do comando com etiquetas de ocupação (para o select). */
export function rtsChannelSelectOptions(
  spec: RtsCommandSpec | undefined,
  rowIndex: number,
  usage: RtsChannelUsageAnalysis
): Array<{ value: string; label: string }> {
  return rtsChannelOptions(spec).map((n) => ({
    value: String(n),
    label: formatRtsChannelSelectLabel(spec?.index ?? 0, n, rowIndex, usage),
  }));
}

/** Próximo par comando/canal livre para atribuição automática numa nova linha. */
export function getNextAvailableRtsAssignment(
  specs: RtsCommandSpec[],
  rows: MeasurementRow[]
): { storeCommand: string; storeChannel: string } | null {
  if (specs.length === 0) return null;
  const usage = analyzeRtsChannelUsage(specs, rows);
  for (const spec of specs) {
    const max = rtsCommandMaxChannel(spec);
    if (max === 0) continue;
    for (let channel = 1; channel <= max; channel += 1) {
      const key = slotKey(spec.index, channel);
      const occupied = usage.slotToRowIndices.get(key);
      if (!occupied || occupied.length === 0) {
        return { storeCommand: String(spec.index), storeChannel: String(channel) };
      }
    }
  }
  return null;
}
