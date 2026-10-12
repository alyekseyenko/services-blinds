export type MapLegendVariant = "admin" | "technician";

export const MAP_LEGEND_STATUS_ITEMS: { label: string; status: "late" | "done" | "unscheduled" }[] = [
  { label: "Atrasada", status: "late" },
  { label: "Concluída", status: "done" },
  { label: "Por agendar", status: "unscheduled" },
];

export function mapLegendHowToRead(variant: MapLegendVariant): string[] {
  const shared = [
    "A cor do alfinete indica o tipo de serviço; as letras no disco branco são a sigla (ex.: MD = medidas, IN = instalação).",
    "O emblema no pino mostra o estado (ex.: ! = atrasada). Visitas agendadas sem emblema extra aparecem como «Agendada».",
    "A hora da visita só aparece depois de tocar no pino.",
    "Círculos com número = várias visitas no mesmo sítio; active o agrupamento no botão à direita do mapa.",
    "O pin «Carr.» é um técnico em campo; «Sede» é a sede / armazém.",
  ];

  if (variant === "technician") {
    return [
      ...shared,
      "Use Lista ou Calendário no menu inferior para ver o dia sem mapa.",
      "O ícone de sincronização no topo mostra alterações por enviar; toque para ver a fila.",
      "O GPS (quando activo) centra o mapa na sua posição — útil em estrada.",
      "Sem rede, as alterações ficam na fila e sincronizam quando voltar a ter ligação.",
    ];
  }

  return [
    ...shared,
    "No painel Filtros pode escolher tipos de serviço, técnico, datas e ver o histórico no mapa.",
    "A barra de rota (quando aberta) permite montar percursos e ver ordem das paragens.",
    "Toque num técnico em campo para ver última posição e visita em curso, quando disponível.",
    "O separador Calendário / Histórico no topo mostra a agenda fora do mapa.",
  ];
}
