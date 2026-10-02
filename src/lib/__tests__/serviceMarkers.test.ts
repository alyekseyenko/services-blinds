import { describe, expect, it } from "vitest";
import {
  buildServiceTypeMarkerSvg,
  getServiceTypeColor,
  normalizeServiceTypeKey,
} from "@/lib/techniciansConfig";
import {
  MAP_PIN_TIP_X,
  MAP_PIN_TIP_Y,
  MAP_PIN_VIEW_HEIGHT,
  MAP_PIN_VIEW_WIDTH,
} from "@/lib/map/serviceMarkerArt";

describe("service map markers", () => {
  it("normaliza etapas do CRM para chaves de ícone", () => {
    expect(normalizeServiceTypeKey("Marcar Instalação")).toBe("INSTALACAO");
    expect(normalizeServiceTypeKey("REMEDICAO")).toBe("REMEDICAO");
    expect(normalizeServiceTypeKey("Assistência")).toBe("REPARACAO");
  });

  it("cada tipo tem monograma distinto", () => {
    const badges = new Set(
      ["INSTALACAO", "MANUTENCAO", "REPARACAO", "TIRAR_MEDIDAS", "REMEDICAO", "REAGENDAR"].map(
        (k) => getServiceTypeColor(k).badge
      )
    );
    expect(badges.size).toBe(6);
  });

  it("cada tipo tem cor de pino distinta", () => {
    const pins = ["INSTALACAO", "TIRAR_MEDIDAS", "REMEDICAO", "REPARACAO"].map(
      (k) => getServiceTypeColor(k).pin
    );
    expect(new Set(pins).size).toBe(4);
  });

  it("SVG em alfinete inclui cor do tipo, disco branco e sigla MD", () => {
    const svg = buildServiceTypeMarkerSvg("TIRAR_MEDIDAS", { size: 42 });
    expect(svg).toContain("#0284c7");
    expect(svg).toContain('fill="#ffffff"');
    expect(svg).toContain(">MD<");
    expect(svg).toContain(`height="${Math.round(42 * (MAP_PIN_VIEW_HEIGHT / MAP_PIN_VIEW_WIDTH))}"`);
  });

  it("atraso mantém cor do tipo e emblema de alerta", () => {
    const svg = buildServiceTypeMarkerSvg("INSTALACAO", { status: "late" });
    expect(svg).toContain("#059669");
    expect(svg).toContain("#dc2626");
  });

  it("técnico aparece como disco sem mudar a cor do serviço", () => {
    const svg = buildServiceTypeMarkerSvg("INSTALACAO", {
      technicianColor: "#ec4899",
    });
    expect(svg).toContain("#059669");
    expect(svg).toContain("#ec4899");
  });

  it("viewBox com ponta no fundo para ancoragem", () => {
    const svg = buildServiceTypeMarkerSvg("GERAL", { size: 36 });
    expect(svg).toContain(`viewBox="0 0 ${MAP_PIN_VIEW_WIDTH} ${MAP_PIN_VIEW_HEIGHT}"`);
    expect(svg).toContain(`M ${MAP_PIN_TIP_X} ${MAP_PIN_TIP_Y}`);
  });
});
