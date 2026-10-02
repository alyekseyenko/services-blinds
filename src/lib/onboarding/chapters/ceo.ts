import { modalStep } from "@/lib/onboarding/tourStepHelpers";
import type { TourChapter } from "@/lib/onboarding/chapters/types";

export const CEO_CHAPTERS: TourChapter[] = [
  {
    id: "default",
    title: "Painel executivo",
    description: "KPIs anuais, pipeline e operações.",
    steps: [
      modalStep(
        "Painel executivo",
        "Métricas anuais de receita, pipeline e operações. Filtre por ano e explore cada separador. Repita o guia com o botão ?."
      ),
      {
        element: '[data-tour="ceo-year"]',
        title: "Ano de análise",
        description: "Selecione o ano civil ou todos os anos para recalcular KPIs e gráficos.",
        side: "bottom",
      },
      {
        element: '[data-tour="ceo-tabs"]',
        title: "Separadores",
        description:
          "Sumário financeiro, comercial, operações e feedback de clientes — cada um com foco distinto.",
        side: "bottom",
      },
      {
        element: '[data-tour="ceo-refresh"]',
        title: "Atualizar métricas",
        description: "Volte a pedir dados ao servidor após alterações relevantes no CRM.",
        side: "left",
      },
      {
        element: '[data-tour="tour-help-button"]',
        title: "Rever o guia",
        description: "Use o ? para repetir o guia executivo.",
        side: "bottom",
      },
    ],
  },
];
