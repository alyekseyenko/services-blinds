import "server-only";

import { crmFetch } from "./client";

export async function createCompanyForAdmin(name: string): Promise<string> {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error("Indique o nome da empresa.");
  }

  const data = await crmFetch<{ createCompany: { id: string } }>(
    `mutation createAdminCompany($data: CompanyCreateInput!) {
      createCompany(data: $data) { id }
    }`,
    { data: { name: trimmed } },
    { timeoutMs: 15000, maxRetries: 0 }
  );

  const id = data.createCompany?.id;
  if (!id) {
    throw new Error("Não foi possível criar a empresa no CRM.");
  }
  return id;
}
