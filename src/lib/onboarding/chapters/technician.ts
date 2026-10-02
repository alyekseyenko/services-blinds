import { modalStep } from "@/lib/onboarding/tourStepHelpers";
import type { TourChapter } from "@/lib/onboarding/chapters/types";

export const TECHNICIAN_CHAPTERS: TourChapter[] = [
  {
    id: "essentials",
    title: "Primeiros passos",
    description:
      "Mapa, visita de exemplo, chegada ao local e onde encontrar avisos, sincronização e o botão ?.",
    startActions: ["showTechViewMap"],
    steps: [
      modalStep(
        "Bem-vindo ao painel de técnico",
        "Este capítulo mostra o essencial no telemóvel: mapa, uma visita fictícia (NSI-GUIA-001) e avisos. Nada do exemplo vai para o CRM. Outros capítulos no botão ? cobrem medições, listas e offline."
      ),
      {
        element: '[data-tour="tech-bottom-nav"]',
        title: "Quatro vistas",
        description:
          "Mapa, Lista, Calendário e Histórico. Para executar visitas, Mapa e Lista são os mais usados.",
        side: "top",
      },
      {
        element: '[data-tour="tech-nav-map"]',
        title: "Mapa do dia",
        description:
          "Pins por visita. Toque num pin para ver morada e hora antes de abrir o detalhe.",
        side: "top",
        prepareOnHighlight: "showTechViewMap",
      },
      modalStep(
        "Pins e visita de formação",
        "No mapa, cada pin é uma visita. A formação usa o exemplo NSI-GUIA-001 (Tirar Medidas) — não existe no CRM. No passo seguinte abrimos o painel dessa visita fictícia."
      ),
      {
        element: '[data-tour="tech-drawer"]',
        title: "Painel da visita",
        description:
          "Deslize o painel para ver todo o conteúdo. Este exemplo é Tirar Medidas — há separador «Medições do Estore» e zona para fechar a visita.",
        side: "bottom",
        align: "center",
        tourAction: "openDemoVisit",
        drawerStep: true,
      },
      {
        element: '[data-tour="tech-drawer-header"]',
        title: "Cabeçalho da visita",
        description:
          "Título, NSI, tipo de serviço e avisos (ex.: visita urgente). Use o X ou a barra no topo para fechar quando não estiver no guia.",
        side: "bottom",
        drawerStep: true,
      },
      {
        element: '[data-tour="tech-drawer-client-card"]',
        title: "Cliente e morada",
        description:
          "Confirme quem é o cliente, a morada e a hora antes de iniciar trabalho no local.",
        side: "bottom",
        drawerStep: true,
      },
      {
        element: '[data-tour="tech-drawer-start-visit"]',
        title: "Cheguei ao local",
        description:
          "Marque que chegou ao cliente — a visita passa a «Em curso» no CRM (ou na fila offline). Os extras e a finalização já estão disponíveis antes disto.",
        side: "bottom",
        drawerStep: true,
        prepareOnHighlight: "drawerMarkScheduled",
      },
      {
        element: '[data-tour="tech-drawer-finalize"]',
        title: "Finalizar visita",
        description:
          "Escolha Concluído, Incompleto ou Cancelado. Em tirar medidas, «Concluído» exige medições válidas guardadas.",
        side: "bottom",
        drawerStep: true,
        prepareOnHighlight: ["drawerTabInfo", "drawerMarkInProgress"],
      },
      {
        element: '[data-tour="tech-drawer-submit-report"]',
        title: "Submeter relatório",
        description:
          "Confirma o estado no CRM. No exemplo de formação verá uma mensagem a dizer que nada foi enviado.",
        side: "bottom",
        drawerStep: true,
        prepareOnHighlight: ["drawerTabInfo", "drawerMarkInProgress", "selectDemoConcluido"],
      },
      {
        element: '[data-tour="tech-mobile-menu-sheet"]',
        title: "Menu no telemóvel",
        description:
          "No telemóvel: GPS, Sincronizar, tema e sair. Nos passos seguintes destacamos o GPS aqui dentro.",
        side: "top",
        viewport: "mobile",
        fallbackModalIfMissing: true,
        prepareOnHighlight: "openTechMobileMenu",
      },
      {
        element: '[data-tour="tech-gps"]',
        title: "GPS operacional",
        description:
          "Partilha posição com o admin (cada ~60 s). Pausa automaticamente das 13h às 14h e fora das 07h–22h; pode pausar manualmente a qualquer hora.",
        side: "bottom",
        viewport: "mobile",
        prepareOnHighlight: "openTechMobileMenu",
        fallbackModalIfMissing: true,
      },
      {
        element: '[data-tour="tech-header-notifications"]',
        title: "Avisos da agenda",
        description:
          "O sininho regista visitas novas, reagendadas, em curso, concluídas, incompletas, canceladas ou removidas. Toque num aviso para abrir no mapa.",
        side: "bottom",
        fallbackModalIfMissing: true,
        prepareOnHighlight: "closeTechMobileMenu",
      },
      {
        element: '[data-tour="tour-help-button"]',
        title: "Capítulos do guia",
        description:
          "O ? abre a lista de capítulos — medições, visita completa, offline, etc. Ideal para rever uma funcionalidade concreta.",
        side: "bottom",
        prepareOnHighlight: "closeTechMobileMenu",
      },
    ],
  },
  {
    id: "visit-flow",
    title: "Visita completa",
    description:
      "Contactos, serviços extra, notas do CRM e estados Incompleto e Cancelado com motivos.",
    startActions: ["openDemoVisit"],
    steps: [
      modalStep(
        "Visita completa",
        "Abriremos a visita de exemplo. Vamos contactar o cliente, extras, notas e todos os estados de fecho."
      ),
      {
        element: '[data-tour="tech-drawer"]',
        title: "Painel da visita",
        description: "Visita fictícia NSI-GUIA-001 — nada é gravado no CRM.",
        side: "bottom",
        align: "center",
        drawerStep: true,
      },
      {
        element: '[data-tour="tech-drawer-contact-card"]',
        title: "Contactar e navegar",
        description:
          "Ligue ao cliente ou abra Google Maps / Waze com a morada. «Sincronizar coordenadas» no guia é simulação.",
        side: "bottom",
        drawerStep: true,
        prepareOnHighlight: ["drawerTabInfo", "drawerMarkInProgress"],
      },
      {
        element: '[data-tour="tech-drawer-services"]',
        title: "Serviços nesta visita",
        description:
          "Lista o serviço principal e eventuais extras registados no CRM durante a visita.",
        side: "bottom",
        drawerStep: true,
      },
      {
        element: '[data-tour="tech-drawer-extra-add"]',
        title: "Adicionar serviço extra",
        description:
          "Se surgir outro trabalho (ex.: manutenção), use o + para criar um serviço extra na mesma visita.",
        side: "bottom",
        drawerStep: true,
      },
      {
        element: '[data-tour="tech-add-service-panel"]',
        title: "Tipo de serviço extra",
        description:
          "Escolha o tipo. Em Manutenção/Reparação pode «Fazer agora» ou «Agendar depois». No guia nada vai ao CRM.",
        side: "bottom",
        align: "center",
        tourAction: "openAddServiceSheet",
        prepareOnHighlight: "openAddServiceSheet",
        sheetStep: true,
      },
      {
        element: '[data-tour="tech-drawer-notes"]',
        title: "Notas do CRM",
        description:
          "Leia o histórico comercial e adicione notas de campo. No exemplo mostramos um toast de formação em vez de gravar.",
        side: "bottom",
        drawerStep: true,
        prepareOnHighlight: ["closeAddServiceSheet", "drawerTabInfo"],
      },
      {
        element: '[data-tour="tech-drawer-finalize"]',
        title: "Estados de fecho",
        description: "Concluído, Incompleto ou Cancelado — escolha o que reflecte o que aconteceu no local.",
        side: "bottom",
        drawerStep: true,
        prepareOnHighlight: "drawerTabInfo",
      },
      {
        element: '[data-tour="tech-drawer-status-incompleto"]',
        title: "Incompleto",
        description: "Seleccione quando não foi possível terminar — escolha um motivo na lista.",
        side: "bottom",
        drawerStep: true,
        tourAction: "selectDemoIncompleto",
        prepareOnHighlight: "drawerTabInfo",
      },
      {
        element: '[data-tour="tech-drawer-status-cancelado"]',
        title: "Cancelado",
        description: "Use quando a visita não se realizou — o motivo é obrigatório.",
        side: "bottom",
        drawerStep: true,
        tourAction: "selectDemoCancelado",
        prepareOnHighlight: "drawerTabInfo",
      },
      {
        element: '[data-tour="tech-drawer-submit-report"]',
        title: "Submeter relatório",
        description: "Confirma o estado escolhido. No guia, nada é enviado ao CRM.",
        side: "bottom",
        drawerStep: true,
        prepareOnHighlight: "drawerTabInfo",
      },
    ],
  },
  {
    id: "measurements",
    title: "Medições",
    description: "Produtos, linhas por janela, rascunho automático e guardar medições.",
    startActions: ["openDemoVisit"],
    steps: [
      modalStep(
        "Medições de estores",
        "Formulário técnico na visita de Tirar Medidas — valores de exemplo incluídos."
      ),
      {
        element: '[data-tour="tech-drawer-tab-measurements"]',
        title: "Separador Medições",
        description:
          "Serviços de tirar medidas / remedição preenchem-se aqui: produto, largura, altura (mm), fixação, etc.",
        side: "bottom",
        drawerStep: true,
        prepareOnHighlight: ["drawerTabMeasurements", "seedDemoMeasurements"],
      },
      {
        element: '[data-tour="tech-measurements-add-product"]',
        title: "Novo produto",
        description: "Adicione outro estore ou toldo na mesma visita com «Novo produto».",
        side: "bottom",
        drawerStep: true,
        prepareOnHighlight: "drawerTabMeasurements",
      },
      {
        element: '[data-tour="tech-measurements-form"]',
        title: "Preencher medições",
        description:
          "Por produto: tipo, material, RAL, activação; por janela: quantidade, largura e altura em mm. Carregamos valores de exemplo ao entrar.",
        side: "bottom",
        drawerStep: true,
        prepareOnHighlight: "drawerTabMeasurements",
      },
      {
        element: '[data-tour="tech-measurements-add-row"]',
        title: "Linha por janela",
        description: "Use «Adicionar Nova Medição (Linha)» quando há várias janelas no mesmo produto.",
        side: "bottom",
        drawerStep: true,
        prepareOnHighlight: "drawerTabMeasurements",
      },
      {
        element: '[data-tour="tech-measurements-draft-status"]',
        title: "Rascunho automático",
        description:
          "Alterações ficam em rascunho local até «Guardar medições». Offline entra na fila de sincronização.",
        side: "bottom",
        drawerStep: true,
        prepareOnHighlight: "drawerTabMeasurements",
      },
      {
        element: '[data-tour="tech-drawer-measurements-save-btn"]',
        title: "Guardar medições",
        description:
          "Grava no relatório (CRM ou fila offline). A validação completa ocorre ao escolher «Concluído» na finalização.",
        side: "top",
        drawerStep: true,
        prepareOnHighlight: "drawerTabMeasurements",
      },
    ],
  },
  {
    id: "views",
    title: "Lista, calendário e histórico",
    description: "Agenda em cartões, calendário partilhado e visitas já fechadas.",
    startActions: ["showTechViewList"],
    steps: [
      modalStep(
        "Outras vistas",
        "Além do mapa, use lista, calendário e histórico para planear e consultar visitas."
      ),
      {
        element: '[data-tour="tech-nav-list"]',
        title: "Vista Lista",
        description:
          "Agenda do dia em cartões, ordenados por hora. Ideal para rever visitas sem mapa.",
        side: "top",
        tourAction: "showTechViewList",
        prepareOnHighlight: "showTechViewList",
      },
      {
        element: '[data-tour="tech-demo-task-card"]',
        title: "Cartão de visita",
        description:
          "Ligar, Navegar ou Abrir — o mesmo painel de visita do mapa. Incluímos o exemplo NSI-GUIA-001 na lista do dia.",
        side: "bottom",
        prepareOnHighlight: "showTechViewList",
        fallbackModalIfMissing: true,
      },
      {
        element: '[data-tour="tech-list-agenda"]',
        title: "Agenda em lista",
        description:
          "Cada cartão abre o painel de visita. Puxe para baixo para atualizar quando tiver rede.",
        side: "bottom",
        prepareOnHighlight: "showTechViewList",
        fallbackModalIfMissing: true,
      },
      {
        element: '[data-tour="tech-nav-calendar"]',
        title: "Vista Calendário",
        description:
          "Visão Mês, Semana, Dia ou Agenda (mobile). Só visitas activas do dia/semana.",
        side: "top",
        tourAction: "showTechViewCalendar",
        prepareOnHighlight: "showTechViewCalendar",
      },
      {
        element: '[data-tour="tech-calendar"]',
        title: "Calendário de visitas",
        description:
          "Toque num bloco para abrir a visita. Deslize horizontalmente para mudar o dia; na borda do ecrã deslize para Mapa ou Lista.",
        side: "bottom",
        prepareOnHighlight: "showTechViewCalendar",
        fallbackModalIfMissing: true,
      },
      {
        element: '[data-tour="tech-nav-history"]',
        title: "Vista Histórico",
        description:
          "Visitas concluídas, incompletas ou canceladas — consulta rápida sem misturar com o dia activo.",
        side: "top",
        tourAction: "showTechViewHistory",
        prepareOnHighlight: "showTechViewHistory",
      },
      {
        element: '[data-tour="tech-history"]',
        title: "Histórico de serviços",
        description:
          "Lista ordenada por data com estado no CRM. Toque num registo para rever detalhes.",
        side: "bottom",
        prepareOnHighlight: "showTechViewHistory",
        fallbackModalIfMissing: true,
      },
      {
        element: '[data-tour="tech-map-day"]',
        title: "Dia no mapa",
        description:
          "Mude o dia com as setas. O contador mostra quantas visitas tem nessa data.",
        side: "bottom",
        tourAction: "showTechViewMap",
        prepareOnHighlight: "showTechViewMap",
        fallbackModalIfMissing: true,
      },
    ],
  },
  {
    id: "offline-sync",
    title: "Offline e sincronização",
    description: "Fila pendente, modo offline e regras ao terminar sessão.",
    startActions: ["showTechViewMap"],
    steps: [
      modalStep(
        "Offline e fila",
        "A app funciona sem rede — saiba onde ver pendências e o que acontece ao sair."
      ),
      {
        element: '[data-tour="tech-header-sync-chip"]',
        title: "Chip de sincronização",
        description:
          "No cabeçalho (quando há pendências) mostra offline, a sincronizar ou quantos itens faltam enviar. Toque para abrir a fila.",
        side: "bottom",
        fallbackModalIfMissing: true,
      },
      {
        element: '[data-tour="tech-sync-queue"]',
        title: "Fila de sincronização",
        description:
          "Veja cada alteração pendente, tente de novo ou descarte (com cuidado). «Tentar sincronizar» envia tudo.",
        side: "bottom",
        fallbackModalIfMissing: true,
        tourAction: "openTechSyncQueue",
        prepareOnHighlight: "openTechSyncQueue",
        sheetStep: true,
      },
      {
        element: '[data-tour="tech-history-sync-queue"]',
        title: "Fila no histórico",
        description:
          "Na vista Histórico pode abrir a fila offline a qualquer momento — útil para rever o que falta enviar.",
        side: "bottom",
        tourAction: "showTechViewHistory",
        prepareOnHighlight: ["closeTechSyncQueue", "showTechViewHistory"],
        fallbackModalIfMissing: true,
      },
      {
        element: '[data-tour="tech-offline-banner"]',
        title: "Modo offline",
        description:
          "Sem rede, aparece um aviso discreto no topo e o mapa passa a cartões com GPS e telefone. No mapa, lista e calendário deslize horizontalmente para mudar o dia; nas bordas do ecrã deslize para mudar de vista (Mapa, Lista, …). As alterações ficam na fila até voltar a ligar.",
        side: "bottom",
        fallbackModalIfMissing: true,
        prepareOnHighlight: "showTechViewMap",
      },
      {
        element: '[data-tour="tech-logout"]',
        title: "Terminar sessão",
        description:
          "«Sair» fica bloqueado enquanto houver alterações por sincronizar — evita perder trabalho de campo.",
        side: "bottom",
        viewport: "desktop",
        fallbackModalIfMissing: true,
      },
      {
        element: '[data-tour="tech-mobile-menu-sheet"]',
        title: "Sair no telemóvel",
        description: "No menu «Ações», o botão Sair respeita a mesma regra da fila pendente.",
        side: "top",
        viewport: "mobile",
        fallbackModalIfMissing: true,
        prepareOnHighlight: "openTechMobileMenu",
      },
    ],
  },
];
