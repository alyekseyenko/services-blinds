import { describe, expect, it } from "vitest";
import {
  diffClientRatings,
  formatClientRatingNotice,
  type ClientRatingNotice,
} from "@/lib/agenda/clientRatingDiff";

const rated: ClientRatingNotice = {
  opportunityId: "opp-1",
  clientName: "Romy",
  serviceNumber: "118",
  rating: 4,
  feedback: "Muito bem",
};

describe("diffClientRatings", () => {
  it("não avisa na primeira leitura", () => {
    expect(diffClientRatings(null, [rated])).toEqual([]);
  });

  it("avisa quando aparece uma avaliação nova ou o comentário muda", () => {
    expect(diffClientRatings([], [rated])).toEqual([rated]);
    expect(diffClientRatings([rated], [{ ...rated, feedback: "Outro" }])).toHaveLength(1);
    expect(diffClientRatings([rated], [rated])).toEqual([]);
  });
});

describe("formatClientRatingNotice", () => {
  it("junta cliente, estrelas e comentário", () => {
    expect(formatClientRatingNotice(rated)).toEqual({
      title: "Avaliação do cliente",
      description: "Romy · N.º 118 · 4 estrelas · Muito bem",
    });
  });
});
