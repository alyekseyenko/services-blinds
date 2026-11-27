export type MapLegendVariant = "admin" | "technician";

export type MapLegendStatusItem = {
  label: string;
  detail: string;
  status: "late" | "done" | "unscheduled" | "cancelled" | "incomplete" | null;
  /** Bolinha no canto esquerdo = técnico atribuído (visita já agendada). */
  technicianDot?: boolean;
  /** Cor explícita da bolinha (`unassigned` = verde, sem técnico). */
  technicianColor?: "unassigned";
};

export const MAP_LEGEND_STATUS_ITEMS: MapLegendStatusItem[] = [
  {
    label: "Agendada",
    detail:
      "Tem data. A bolinha à esquerda é o técnico (cada cor = uma pessoa). O alfinete MD / RM / IN é o tipo de serviço, não o estado.",
    status: null,
    technicianDot: true,
  },
  {
    label: "Por agendar",
    detail:
      "Relógio cinzento à direita — ainda não há visita marcada. Bolinha verde à esquerda = nenhum técnico atribuído.",
    status: "unscheduled",
    technicianDot: true,
    technicianColor: "unassigned",
  },
  {
    label: "Atrasada",
    detail: "! vermelho — já passou a hora marcada e ainda está Agendada. Um dia futuro não é atrasado.",
    status: "late",
  },
  {
    label: "Concluída",
    detail: "Visto verde — o técnico fechou a visita no local.",
    status: "done",
  },
  {
    label: "Incompleta",
    detail: "i âmbar — a visita começou mas não ficou fechada (volta a marcar).",
    status: "incomplete",
  },
  {
    label: "Cancelada",
    detail: "X vermelho — visita cancelada. O serviço fica no mesmo tipo (ex. retificação).",
    status: "cancelled",
  },
];

export const MAP_LEGEND_TECH_DOT_TITLE = "Técnicos e cores";

export const MAP_LEGEND_TECH_DOT_DETAIL =
  "Cada técnico tem uma cor na bolinha do canto superior esquerdo. Não é concluído nem atraso. Se dois nomes tiverem a mesma cor, a paleta só tem 8 cores.";

export const MAP_LEGEND_UNASSIGNED_TECH_LABEL = "Nenhum técnico atribuído";

export const MAP_LEGEND_UNASSIGNED_TECH_DETAIL =
  "Bolinha verde no canto superior esquerdo — ainda não há técnico nesta visita.";

export const MAP_LEGEND_TECH_DOT_EMPTY = "Sem técnicos nas visitas visíveis neste mapa.";

export const MAP_LEGEND_ROUTE_TITLE = "Percurso do técnico";

export const MAP_LEGEND_ROUTE_DETAIL =
  "Ao tocar no nome nos Filtros vê as visitas dele (alfinetes MD / IN…). Ao tocar na carrinha, o mapa mostra as paragens do dia: o número é a ordem, a cor é o estado.";

export const MAP_LEGEND_ROUTE_ITEMS: Array<{
  label: string;
  detail: string;
  kind: "pending" | "late" | "done" | "incomplete" | "cancelled";
  isNext: boolean;
  exampleIndex: number;
}> = [
  {
    label: "Por fazer",
    detail: "Número no alfinete azul — visita ainda por cumprir, na ordem do dia.",
    kind: "pending",
    isNext: false,
    exampleIndex: 0,
  },
  {
    label: "Próxima",
    detail: "Número no alfinete fúcsia — próxima paragem da rota (não é o azul «por fazer»).",
    kind: "pending",
    isNext: true,
    exampleIndex: 0,
  },
  {
    label: "Atrasada",
    detail: "! no disco, alfinete vermelho — igual ao incompleto, mas vermelho. Já passou a hora.",
    kind: "late",
    isNext: false,
    exampleIndex: 1,
  },
  {
    label: "Concluída",
    detail: "Visto verde — o técnico já fechou esta paragem.",
    kind: "done",
    isNext: false,
    exampleIndex: 2,
  },
  {
    label: "Incompleta",
    detail: "! âmbar — esteve no local mas a visita não ficou fechada.",
    kind: "incomplete",
    isNext: false,
    exampleIndex: 3,
  },
  {
    label: "Cancelada",
    detail: "X vermelho — esta paragem foi cancelada.",
    kind: "cancelled",
    isNext: false,
    exampleIndex: 4,
  },
];

export function mapLegendHowToRead(variant: MapLegendVariant): string[] {
  const shared = [
    "A cor do alfinete e as letras (MD, RM, IN…) são o tipo de serviço.",
    "A bolinha no canto superior esquerdo é o técnico. Verde = nenhum técnico atribuído. Outras cores = pessoas diferentes, não estados da visita.",
    "O emblema no canto direito é o estado: relógio = por agendar; ! = atrasada; visto = concluída; i = incompleta; X = cancelada.",
    "A hora da visita só aparece depois de tocar no pino.",
    "Círculos com número = várias visitas no mesmo sítio; active o agrupamento no botão à direita do mapa.",
    "O círculo com a carrinha é um técnico em campo (GPS); o logótipo é a sede / armazém.",
    "O boneco verde no canto superior direito abre a vista de rua: arraste-o para o sítio e veja a fachada.",
  ];

  if (variant === "technician") {
    return [
      ...shared,
      "O percurso do dia (quando activo) usa pinos numerados — a cor é o estado, o número é a ordem. Está na Legenda, em Percurso do técnico.",
      "Use Lista ou Calendário no menu inferior para ver o dia sem mapa.",
      "O ícone de sincronização no topo mostra alterações por enviar; toque para ver a fila.",
      "O GPS (quando activo) centra o mapa na sua posição — útil em estrada.",
      "Sem rede, as alterações ficam na fila e sincronizam quando voltar a ter ligação.",
    ];
  }

  return [
    ...shared,
    "Nos Filtros, toque num técnico para ver só as visitas dele. A borda do nome é a mesma cor da bolinha no pino. Toque na carrinha (ou no nome GPS) para o percurso do dia — pinos numerados, descritos na Legenda.",
    "Concluído, incompleto e cancelado no mapa: Filtros → Histórico no mapa (os três botões). Sem isso só vê visitas ainda em aberto.",
    "No painel Filtros também escolhe tipos de serviço, datas e tempo parado.",
    "A barra de rota (quando aberta) permite montar percursos e ver ordem das paragens.",
    "O separador Calendário / Histórico no topo mostra a agenda fora do mapa.",
  ];
}
