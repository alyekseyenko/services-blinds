"use client";

export default function ServerConnectionBanner({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <div
      role="status"
      className="z-[60] flex items-center justify-center gap-2 border-b border-warning-solid/30 bg-warning-solid/90 px-3 py-1.5 text-center text-xs font-semibold text-ink-foreground"
    >
      Servidor indisponível — a usar dados locais. A tentar de novo em breve.
    </div>
  );
}
