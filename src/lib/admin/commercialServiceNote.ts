/** Nota do Twenty ao criar serviço no mapa: ligada ao cliente e à oportunidade. */
export function buildAdminServiceCreationNote(input: {
  operatorName: string;
  internalNotes?: string | null;
}): { title: string; body: string } {
  const opened = `Serviço aberto no painel operacional por ${input.operatorName}.`;
  const notes = input.internalNotes?.trim();
  if (!notes) {
    return { title: "Criado no painel", body: opened };
  }
  return {
    title: "Notas internas",
    body: `${notes}\n\n${opened}`,
  };
}
