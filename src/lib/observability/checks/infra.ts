import { env } from "@/lib/env";
import {
  probeAppDataDir,
  probeMetadata,
  probeRedis,
  runAppHealthProbes,
} from "@/lib/server/healthProbes";
import { getOutboxDrainHeartbeat } from "@/lib/server/outboxDrain";
import { defineE2ECheck } from "../checkHelpers";

const DRAIN_WARN_MS = 2 * 60 * 1000;
const DRAIN_FAIL_MS = 10 * 60 * 1000;

export const redisPingCheck = defineE2ECheck({
  id: "redis-ping",
  name: "Redis",
  category: "INFRA",
  description: "Ping ao Redis partilhado (cache CRM)",
  tier: "safe",
  covers: ["system:redis"],
  remediation: "Configure REDIS_URL e confirme que o serviço está acessível.",
  async run() {
    const probe = await probeRedis();
    if (probe.status === "connected") {
      return {
        status: "PASS",
        message: `Redis respondeu em ${probe.latencyMs}ms.`,
        details: { ...probe },
      };
    }
    const missing = probe.error?.includes("não configurado");
    return {
      status: missing ? "WARN" : "FAIL",
      message: probe.error ?? "Redis indisponível.",
      details: { ...probe },
    };
  },
});

export const twentyMetadataCheck = defineE2ECheck({
  id: "twenty-metadata",
  name: "Twenty metadata",
  category: "CRM",
  description: "API de metadata do Twenty responde",
  tier: "safe",
  covers: ["system:twenty-metadata"],
  remediation: "Verifique TWENTY_METADATA_URL e TWENTY_API_KEY.",
  async run() {
    const probe = await probeMetadata();
    if (!probe) {
      return { status: "FAIL", message: "Metadata probe não executou." };
    }
    if (probe.status === "connected") {
      return {
        status: "PASS",
        message: `Metadata OK (${probe.latencyMs}ms).`,
        details: { ...probe },
      };
    }
    return {
      status: "FAIL",
      message: probe.error ?? "Metadata indisponível.",
      details: { ...probe },
    };
  },
});

export const twentyRestAuthCheck = defineE2ECheck({
  id: "twenty-auth-origin",
  name: "Twenty auth / REST",
  category: "CRM",
  description: "Origem de autenticação Twenty configurada para login",
  tier: "safe",
  covers: ["system:twenty-rest"],
  remediation: "Defina TWENTY_AUTH_ORIGIN com o URL público do Twenty.",
  async run() {
    const configured = Boolean(env.TWENTY_AUTH_ORIGIN?.trim());
    if (process.env.NODE_ENV === "production" && !configured) {
      return {
        status: "FAIL",
        message: "TWENTY_AUTH_ORIGIN em falta em produção.",
      };
    }
    return {
      status: configured ? "PASS" : "WARN",
      message: configured
        ? "TWENTY_AUTH_ORIGIN configurado."
        : "TWENTY_AUTH_ORIGIN não definido (aceitável em desenvolvimento).",
    };
  },
});

export const appDataDirWritableCheck = defineE2ECheck({
  id: "app-data-dir-writable",
  name: "Volume de dados",
  category: "INFRA",
  description: "Pasta APP_DATA_DIR gravável (outbox, histórico)",
  tier: "safe",
  covers: ["system:app-data-dir"],
  remediation: "Monte o volume em APP_DATA_DIR ou use src/scratch em dev.",
  async run() {
    const probe = await probeAppDataDir();
    if (probe.status === "connected") {
      return {
        status: "PASS",
        message: `Dados graváveis (${probe.latencyMs}ms).`,
        details: { ...probe },
      };
    }
    return {
      status: "FAIL",
      message: probe.error ?? "Pasta de dados indisponível.",
      details: { ...probe },
    };
  },
});

export const outboxDrainHeartbeatCheck = defineE2ECheck({
  id: "outbox-drain-heartbeat",
  name: "Timer do outbox",
  category: "OUTBOX",
  description: "O drain periódico do outbox está ativo",
  tier: "safe",
  covers: ["system:outbox-drain"],
  remediation: "Confirme que instrumentation arranca startOutboxDrain no Node.",
  async run() {
    const { lastTickAt } = getOutboxDrainHeartbeat();
    if (!lastTickAt) {
      return {
        status: "WARN",
        message: "Ainda sem tick do drain (arranque recente?).",
      };
    }
    const ageMs = Date.now() - lastTickAt;
    if (ageMs > DRAIN_FAIL_MS) {
      return {
        status: "FAIL",
        message: `Último tick há ${Math.round(ageMs / 60_000)} min.`,
        details: { lastTickAt, ageMs },
      };
    }
    if (ageMs > DRAIN_WARN_MS) {
      return {
        status: "WARN",
        message: `Último tick há ${Math.round(ageMs / 60_000)} min.`,
        details: { lastTickAt, ageMs },
      };
    }
    return {
      status: "PASS",
      message: `Drain ativo (último tick há ${Math.round(ageMs / 1000)}s).`,
      details: { lastTickAt, ageMs },
    };
  },
});

export const appHealthProbesCheck = defineE2ECheck({
  id: "app-health-endpoint",
  name: "Saúde da aplicação",
  category: "APP",
  description: "Probes internas de saúde (sem fetch HTTP externo)",
  tier: "safe",
  covers: ["api:/api/health", "system:twenty-graphql"],
  remediation: "Inspecione CRM, Redis e volume de dados.",
  async run() {
    const probes = await runAppHealthProbes();
    if (!probes.healthy) {
      return {
        status: "FAIL",
        message: "GraphQL CRM indisponível.",
        details: { ...probes },
      };
    }
    const degraded =
      probes.redis.status === "disconnected" ||
      probes.appData.status === "disconnected";
    return {
      status: degraded ? "WARN" : "PASS",
      message: degraded
        ? "App online com subsistemas degradados."
        : "Probes de saúde OK.",
      details: { ...probes },
    };
  },
});
