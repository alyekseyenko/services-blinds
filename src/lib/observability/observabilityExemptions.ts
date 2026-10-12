/**
 * Rotas API sem verificação E2E dedicada — cada isenção precisa de motivo explícito.
 * O teste `coverage.test.ts` falha se uma rota nova não estiver coberta nem aqui.
 */
export const OBSERVABILITY_API_EXEMPTIONS: Record<string, string> = {
  "/api/auth/[...nextauth]":
    "NextAuth — autenticação coberta por testes de sessão e fluxo de login.",
  "/api/qa":
    "Disparador manual da suite E2E / Luxury (apenas admin estrito).",
  "/api/observability":
    "Console SRE — mutações e telemetria servidas pela própria página.",
  "/api/observability/status":
    "Leitura do histórico agendado — validada pelo scheduler e testes unitários.",
  "/api/opportunities":
    "Agenda admin — coberta por verificações CRM e fluxo Luxury.",
  "/api/opportunities/history":
    "Histórico admin — leitura derivada do CRM.",
  "/api/opportunities/maintenance":
    "Manutenção de oportunidades — mutação admin coberta pelo CRM.",
  "/api/opportunities/lookup":
    "Resolução pontual de oportunidade por taskId — leitura CRM para sininho admin.",
  "/api/tasks":
    "Agenda do técnico — coberta por contratos de scheduling e Luxury.",
  "/api/members":
    "Lista de membros Twenty — dependência do CRM GraphQL.",
  "/api/location":
    "POST de GPS coberto por `location-store-roundtrip`; GET exige sessão admin.",
  "/api/voice/transcribe":
    "Ditada opcional (OPENAI_API_KEY / VOICE_PROVIDER) — sessão técnico; sem chave devolve 503.",
  "/api/voice/status":
    "Indicador de ditada disponível — leitura leve com sessão técnico.",
  "/api/voice/stream":
    "Ditada Google em streaming (VOICE_PROVIDER=google) — sessão técnico; iOS usa batch no /transcribe.",
};
