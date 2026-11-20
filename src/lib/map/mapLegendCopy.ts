export type MapLegendVariant = "admin" | "technician";

export type MapLegendStatusItem = {
  label: string;
  detail: string;
  status: "late" | "done" | "unscheduled" | null;
  /** Bolinha no canto = técnico atribuído (visita já agendada). */
  technicianDot?: boolean;
};

export const MAP_LEGEND_STATUS_ITEMS: MapLegendStatusItem[] = [
  {
    label: "Agendada",
    detail:
      "Já tem data e técnico. A bolinha no canto é a pessoa (azul, verde, laranja…). O alfinete verde IN / MD é o tipo de serviço, não o estado.",
    status: null,
    technicianDot: true,
  },
  {
    label: "Por agendar",
    detail: "Relógio cinzento — ainda não há visita marcada.",
    status: "unscheduled",
  },
  {
    label: "Atrasada",
    detail: "! vermelho — já passou a hora marcada e ainda está Agendada. Um dia futuro (ex. 20/11) não é atrasado.",
    status: "late",
  },
  {
    label: "Concluída",
    detail: "Visto verde — visita fechada.",
    status: "done",
  },
];

export function mapLegendHowToRead(variant: MapLegendVariant): string[] {
  const shared = [
    "A cor do alfinete indica o tipo de serviço; as letras no disco branco são a sigla (ex.: MD = medidas, IN = instalação).",
    "A bolinha colorida no canto do pino é o técnico atribuído: essa visita já está agendada. Sem bolinha e com relógio = por agendar.",
    "O emblema no pino mostra o estado: relógio = por agendar; ! vermelho = visita atrasada (já passou a hora marcada e ainda está Agendada). Um agendamento noutro dia (ex. 20/11) não é atrasado.",
    "A hora da visita só aparece depois de tocar no pino.",
    "Círculos com número = várias visitas no mesmo sítio; active o agrupamento no botão à direita do mapa.",
    "O pin «Carr.» é um técnico em campo; «Sede» é a sede / armazém.",
    "O boneco verde no canto superior direito abre a vista de rua: arraste-o para o sítio e veja a fachada.",
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
