import type { ZodError } from "zod";
import {
  CreateAdminClientSchema,
  type CreateAdminClientInput,
} from "@/lib/schemas/adminCommercialService";

export type AdminClientFormFieldErrors = Record<string, string>;

function zodIssuesToFieldMap(error: ZodError): AdminClientFormFieldErrors {
  const out: AdminClientFormFieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? issue.path.map(String).join(".") : "form";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

export function buildAdminClientFormSummary(fieldErrors: AdminClientFormFieldErrors): string {
  const messages = Object.values(fieldErrors).filter(Boolean);
  if (messages.length === 0) {
    return "Verifique os dados do formulário.";
  }
  if (messages.length === 1) {
    return messages[0];
  }
  return `Há ${messages.length} campos por corrigir — veja os avisos abaixo.`;
}

export function validateCreateAdminClientInput(
  raw: unknown
):
  | { ok: true; data: CreateAdminClientInput }
  | { ok: false; fieldErrors: AdminClientFormFieldErrors; summary: string } {
  const parsed = CreateAdminClientSchema.safeParse(raw);
  if (parsed.success) {
    return { ok: true, data: parsed.data };
  }
  const fieldErrors = zodIssuesToFieldMap(parsed.error);
  return {
    ok: false,
    fieldErrors,
    summary: buildAdminClientFormSummary(fieldErrors),
  };
}

/** Mapeia erros do CRM / servidor para campos quando possível. */
export function mapCreateAdminClientServerError(message: string): {
  fieldErrors: AdminClientFormFieldErrors;
  summary: string;
} {
  const trimmed = message.trim() || "Não foi possível criar o cliente.";
  const lower = trimmed.toLowerCase();
  const fieldErrors: AdminClientFormFieldErrors = {};

  if (lower.includes("e-mail") || lower.includes("email")) {
    fieldErrors.email = trimmed;
  } else if (lower.includes("telefone") || lower.includes("telemóvel")) {
    fieldErrors.phoneNational = trimmed;
  } else if (lower.includes("nif")) {
    fieldErrors.nif = trimmed;
  } else if (lower.includes("morada") || lower.includes("endereço")) {
    fieldErrors["morada.addressStreet1"] = trimmed;
  } else if (lower.includes("nome")) {
    fieldErrors.firstName = trimmed;
  } else {
    fieldErrors.form = trimmed;
  }

  return { fieldErrors, summary: trimmed };
}
