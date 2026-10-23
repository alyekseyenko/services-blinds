export const RTS_MAX_COMMANDS = 100;
export const RTS_MAX_CHANNELS_PER_COMMAND = 99;

export type RtsCommandMode = "" | "UM_CANAL" | "VARIOS_CANAIS";

export type RtsCommandSpec = {
  /** 1-based. */
  index: number;
  mode: RtsCommandMode;
  /** Canais do comando; null em «vários» ainda sem número. */
  channelCount: number | null;
};

type RtsDetails = {
  rtsCommandCount?: string;
  rtsCommandChannels?: string;
  /** Legado: um único comando. */
  rtsCommandMode?: string;
  rtsChannelCount?: string;
};

/**
 * Token por comando em `rtsCommandChannels` (CSV):
 * "1" = um canal, "V" = vários sem número, "V5" = vários com 5 canais.
 */
const UM_CANAL_TOKEN = "1";
const VARIOS_PREFIX = "V";

function parsePositiveInt(raw?: string): number | null {
  const n = Number.parseInt(String(raw ?? "").trim(), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function clampChannels(n: number | null): number | null {
  return n === null ? null : Math.min(n, RTS_MAX_CHANNELS_PER_COMMAND);
}

export function parseRtsCommandCount(raw?: string): number {
  const n = parsePositiveInt(raw);
  if (n === null) return 0;
  return Math.min(n, RTS_MAX_COMMANDS);
}

function parseToken(token: string | undefined, index: number): RtsCommandSpec {
  const t = (token ?? "").trim().toUpperCase();
  if (t === UM_CANAL_TOKEN) return { index, mode: "UM_CANAL", channelCount: 1 };
  if (t.startsWith(VARIOS_PREFIX)) {
    return {
      index,
      mode: "VARIOS_CANAIS",
      channelCount: clampChannels(parsePositiveInt(t.slice(VARIOS_PREFIX.length))),
    };
  }
  return { index, mode: "", channelCount: null };
}

function serializeToken(spec: RtsCommandSpec): string {
  if (spec.mode === "UM_CANAL") return UM_CANAL_TOKEN;
  if (spec.mode === "VARIOS_CANAIS") {
    return spec.channelCount ? `${VARIOS_PREFIX}${spec.channelCount}` : VARIOS_PREFIX;
  }
  return "";
}

function legacySingleCommand(details: RtsDetails): RtsCommandSpec[] {
  if (details.rtsCommandMode === "UM_CANAL") {
    return [{ index: 1, mode: "UM_CANAL", channelCount: 1 }];
  }
  if (details.rtsCommandMode === "VARIOS_CANAIS") {
    return [
      {
        index: 1,
        mode: "VARIOS_CANAIS",
        channelCount: clampChannels(parsePositiveInt(details.rtsChannelCount)),
      },
    ];
  }
  return [];
}

/** Comandos definidos no produto (fichas antigas com um só modo contam como 1 comando). */
export function getRtsCommandSpecs(details: RtsDetails): RtsCommandSpec[] {
  if (!details.rtsCommandCount?.trim()) return legacySingleCommand(details);
  const count = parseRtsCommandCount(details.rtsCommandCount);
  const tokens = details.rtsCommandChannels?.split(",") ?? [];
  return Array.from({ length: count }, (_, i) => parseToken(tokens[i], i + 1));
}

/**
 * Altera um comando e devolve o novo CSV. Tokens para lá da quantidade atual
 * mantêm-se, para não perder escolhas ao corrigir a quantidade.
 */
export function updateRtsCommandSpec(
  details: RtsDetails,
  commandIndex: number,
  patch: Partial<Pick<RtsCommandSpec, "mode" | "channelCount">>
): string {
  const tokens = details.rtsCommandChannels?.trim()
    ? details.rtsCommandChannels.split(",")
    : legacySingleCommand(details).map(serializeToken);
  while (tokens.length < commandIndex) tokens.push("");
  const current = parseToken(tokens[commandIndex - 1], commandIndex);
  const mode = patch.mode ?? current.mode;
  const channelCount =
    mode === "UM_CANAL"
      ? 1
      : mode === "VARIOS_CANAIS"
        ? clampChannels(
            patch.channelCount !== undefined
              ? patch.channelCount
              : current.mode === "VARIOS_CANAIS"
                ? current.channelCount
                : null
          )
        : null;
  tokens[commandIndex - 1] = serializeToken({ index: commandIndex, mode, channelCount });
  return tokens.join(",");
}

/** Último canal que se pode escolher neste comando (0 = ainda por definir). */
export function rtsCommandMaxChannel(spec: RtsCommandSpec | undefined): number {
  if (!spec) return 0;
  if (spec.mode === "UM_CANAL") return 1;
  if (spec.mode === "VARIOS_CANAIS") return spec.channelCount ?? 0;
  return 0;
}

export function rtsChannelOptions(spec: RtsCommandSpec | undefined): number[] {
  const max = rtsCommandMaxChannel(spec);
  return Array.from({ length: max }, (_, i) => i + 1);
}

export function formatRtsCommandChannels(spec: RtsCommandSpec): string {
  if (spec.mode === "UM_CANAL") return "1 canal";
  if (spec.mode === "VARIOS_CANAIS") {
    if (!spec.channelCount) return "Vários canais";
    return spec.channelCount === 1 ? "1 canal" : `${spec.channelCount} canais`;
  }
  return "";
}

function formatCommandCount(n: number): string {
  return n === 1 ? "1 comando" : `${n} comandos`;
}

/** Entradas para a ficha, Excel e PDF. */
export function getRtsCommandDetailEntries(
  details: RtsDetails
): Array<{ label: string; value: string }> {
  const specs = getRtsCommandSpecs(details);
  if (specs.length === 0) return [];
  return [
    { label: "Comandos RTS", value: formatCommandCount(specs.length) },
    ...specs.map((spec) => ({
      label: `Comando ${spec.index}`,
      value: formatRtsCommandChannels(spec) || "—",
    })),
  ];
}

/** Resumo numa linha (notas do CRM). */
export function formatRtsCommandsSummary(details: RtsDetails): string {
  const specs = getRtsCommandSpecs(details);
  if (specs.length === 0) return "";
  const parts = specs
    .map((spec) => {
      const channels = formatRtsCommandChannels(spec);
      return channels ? `C${spec.index}: ${channels}` : "";
    })
    .filter(Boolean);
  const head = formatCommandCount(specs.length);
  return parts.length ? `${head} (${parts.join(" · ")})` : head;
}

/** Depois de mudar os comandos do produto, limpa escolhas de linha que deixaram de existir. */
export function sanitizeRowRtsAssignment<T extends { storeCommand?: string; storeChannel?: string }>(
  row: T,
  specs: RtsCommandSpec[]
): T {
  const command = parsePositiveInt(row.storeCommand);
  if (command === null) return row;
  const spec = specs.find((s) => s.index === command);
  if (!spec) return { ...row, storeCommand: "", storeChannel: "" };
  const max = rtsCommandMaxChannel(spec);
  const channel = parsePositiveInt(row.storeChannel);
  if (max === 1 && channel !== 1) return { ...row, storeChannel: "1" };
  if (max > 0 && channel !== null && channel > max) return { ...row, storeChannel: "" };
  return row;
}
