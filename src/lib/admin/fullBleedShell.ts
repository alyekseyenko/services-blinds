/** Full-viewport shell for painel Início, lista de medições e ficha (largura total). */
export const adminFullBleedShell = {
  page: "flex min-h-dvh flex-col bg-background",
  header: "shrink-0 border-b border-border bg-card",
  headerInner: "flex w-full flex-col gap-3 px-4 py-4 sm:px-6 lg:px-8",
  scrollMain: "min-h-0 flex-1 overflow-y-auto overscroll-contain brutal-grid-bg",
  content: "flex w-full max-w-none flex-col gap-5 px-4 pb-[max(5rem,env(safe-area-inset-bottom))] pt-4 sm:px-6 lg:px-8",
} as const;
