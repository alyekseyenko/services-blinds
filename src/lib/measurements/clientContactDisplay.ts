import type { MeasurementSheet } from "@/lib/schemas/measurementSheet";

export type MeasurementClientContactField = {
  label: string;
  value: string;
};

export function measurementClientContactFields(
  sheet: Pick<MeasurementSheet, "clientNif" | "clientPhone" | "clientEmail">
): MeasurementClientContactField[] {
  const fields: MeasurementClientContactField[] = [];
  const nif = sheet.clientNif?.trim();
  const phone = sheet.clientPhone?.trim();
  const email = sheet.clientEmail?.trim();
  if (nif) fields.push({ label: "NIF", value: nif });
  if (phone) fields.push({ label: "Telefone", value: phone });
  if (email) fields.push({ label: "E-mail", value: email });
  return fields;
}

export function measurementClientContactInline(
  sheet: Pick<MeasurementSheet, "clientNif" | "clientPhone" | "clientEmail">
): string {
  return measurementClientContactFields(sheet)
    .map((f) => `${f.label}: ${f.value}`)
    .join(" · ");
}

/** Linhas ordenadas para PDF/Excel (cliente + morada + contactos). */
export function measurementClientDetailRows(
  sheet: Pick<
    MeasurementSheet,
    "clientName" | "address" | "clientNif" | "clientPhone" | "clientEmail"
  >
): MeasurementClientContactField[] {
  const rows: MeasurementClientContactField[] = [
    { label: "Cliente", value: sheet.clientName?.trim() || "—" },
    { label: "Morada", value: sheet.address?.trim() || "—" },
  ];
  rows.push(...measurementClientContactFields(sheet));
  return rows;
}