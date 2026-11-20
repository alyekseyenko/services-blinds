import { describe, expect, it } from "vitest";
import {
  VISIT_SERVICE_FILES_MAX,
  mapCrmAttachmentsToList,
  mapCrmAttachmentToListItem,
  summarizeVisitServiceFileList,
  type CrmOpportunityAttachmentNode,
} from "@/lib/visits/visitServiceFiles";

describe("visitServiceFiles mapper", () => {
  it("resume fotos e documentos para o técnico", () => {
    expect(summarizeVisitServiceFileList([])).toBe("Sem ficheiros no CRM.");
    expect(
      summarizeVisitServiceFileList([
        {
          id: "a1111111-1111-4111-8111-111111111111",
          name: "a.jpg",
          extension: "jpg",
          createdAt: "2024-01-01T00:00:00.000Z",
          kind: "image",
        },
        {
          id: "b2222222-2222-4222-8222-222222222222",
          name: "b.jpg",
          extension: "jpg",
          createdAt: "2024-01-02T00:00:00.000Z",
          kind: "image",
        },
      ])
    ).toBe("2 fotos no CRM.");
    expect(
      summarizeVisitServiceFileList([
        {
          id: "c3333333-3333-4333-8333-333333333333",
          name: "x.pdf",
          extension: "pdf",
          createdAt: "2024-01-01T00:00:00.000Z",
          kind: "file",
        },
      ])
    ).toBe("1 documento no CRM.");
  });
  it("classifica imagem vs ficheiro pela extensão", () => {
    const image = mapCrmAttachmentToListItem({
      id: "a1111111-1111-4111-8111-111111111111",
      name: "foto.jpg",
      createdAt: "2024-01-01T10:00:00.000Z",
      file: [{ extension: "jpg", url: "https://secret.example/x" }],
    });
    expect(image?.kind).toBe("image");

    const pdf = mapCrmAttachmentToListItem({
      id: "b2222222-2222-4222-8222-222222222222",
      name: "relatorio.pdf",
      createdAt: "2024-01-02T10:00:00.000Z",
      file: [{ extension: "pdf", url: "https://secret.example/y" }],
    });
    expect(pdf?.kind).toBe("file");
  });

  it("não inclui url na lista mapeada", () => {
    const item = mapCrmAttachmentToListItem({
      id: "c3333333-3333-4333-8333-333333333333",
      name: "doc.xlsx",
      createdAt: "2024-01-03T10:00:00.000Z",
      file: [{ extension: "xlsx", url: "https://should-not-leak.example/z" }],
    });
    expect(item).not.toBeNull();
    expect(item).toEqual({
      id: "c3333333-3333-4333-8333-333333333333",
      name: "doc.xlsx",
      extension: "xlsx",
      createdAt: "2024-01-03T10:00:00.000Z",
      kind: "file",
    });
    expect(Object.keys(item ?? {})).not.toContain("url");
  });

  it("ordena por data e limita a 40", () => {
    const nodes: CrmOpportunityAttachmentNode[] = [];
    for (let i = 0; i < 50; i++) {
      nodes.push({
        id: `d4444444-4444-4444-8444-${String(i).padStart(12, "0")}`,
        name: `f${i}.png`,
        createdAt: new Date(Date.UTC(2024, 0, 1, 12, i)).toISOString(),
        file: [{ extension: "png" }],
      });
    }

    const list = mapCrmAttachmentsToList(nodes);
    expect(list).toHaveLength(VISIT_SERVICE_FILES_MAX);
    expect(list[0]?.name).toBe("f49.png");
    expect(list[list.length - 1]?.name).toBe("f10.png");
  });
});