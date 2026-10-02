import { modalStep } from "@/lib/onboarding/tourStepHelpers";
import type { TourChapter } from "@/lib/onboarding/chapters/types";

export const WAREHOUSE_CHAPTERS: TourChapter[] = [
  {
    id: "default",
    title: "Armazém",
    description: "Preparação de encomendas antes da instalação.",
    steps: [
      modalStep(
        "Armazém e preparação",
        "Aqui prepara encomendas antes da instalação. Veja onde pesquisar, acompanhar KPIs e sincronizar."
      ),
      {
        element: '[data-tour="warehouse-search"]',
        title: "Pesquisa rápida",
        description: "Filtre por NSI, cliente, localidade ou detalhes da encomenda.",
        side: "bottom",
      },
      {
        element: '[data-tour="warehouse-stats"]',
        title: "Resumo do dia",
        description: "Contadores de ordens pendentes, prontas e concluídas — visão imediata da fila.",
        side: "bottom",
      },
      {
        element: '[data-tour="warehouse-sync"]',
        title: "Sincronizar CRM",
        description: "Carregue a lista mais recente do Twenty antes de marcar preparação concluída.",
        side: "left",
      },
      {
        element: '[data-tour="tour-help-button"]',
        title: "Rever o guia",
        description: "Use o ? para repetir o guia quando precisar.",
        side: "bottom",
      },
    ],
  },
];
