import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { resolveN8nWebhookUrl } from "../n8nWebhooks";

describe("resolveN8nWebhookUrl", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    delete process.env.N8N_WEBHOOK_URL;
    delete process.env.N8N_AGENDAMENTO_WEBHOOK_URL;
    delete process.env.N8N_WEBHOOK_URL_REPORTS;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("uses the scheduling webhook for appointment_scheduled", () => {
    process.env.N8N_AGENDAMENTO_WEBHOOK_URL =
      "https://n8n.example.com/webhook/agendamento";
    process.env.N8N_WEBHOOK_URL = "https://n8n.example.com/webhook/general";

    expect(resolveN8nWebhookUrl("appointment_scheduled")).toBe(
      "https://n8n.example.com/webhook/agendamento"
    );
  });

  it("routes admin map cancellations through the scheduling webhook", () => {
    process.env.N8N_AGENDAMENTO_WEBHOOK_URL =
      "https://n8n.example.com/webhook/agendamento";
    expect(resolveN8nWebhookUrl("appointment_cancelled_by_admin")).toBe(
      "https://n8n.example.com/webhook/agendamento"
    );
  });

  it("routes client cancellations through the scheduling webhook", () => {
    process.env.N8N_AGENDAMENTO_WEBHOOK_URL =
      "https://n8n.example.com/webhook/agendamento";

    expect(resolveN8nWebhookUrl("appointment_cancelled_by_client")).toBe(
      "https://n8n.example.com/webhook/agendamento"
    );
  });

  it("falls back to the general webhook when scheduling webhook is missing", () => {
    process.env.N8N_WEBHOOK_URL = "https://n8n.example.com/webhook/general";

    expect(resolveN8nWebhookUrl("appointment_scheduled")).toBe(
      "https://n8n.example.com/webhook/general"
    );
  });
});
