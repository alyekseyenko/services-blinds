import { describe, expect, it } from "vitest";
import { buildGeocodeQuery, extractPtPostcode, nominatimStreetCoords, normalizeGeocodeAddress, pickPreciseGoogleLocation, stripTrailingDoorNumber } from "@/lib/geocoder";

describe("buildGeocodeQuery", () => {
  it("acrescenta Portugal quando falta o país", () => {
    expect(buildGeocodeQuery("Rua da Liberdade 12, Caldas da Rainha")).toBe(
      "Rua da Liberdade 12, Caldas da Rainha, Portugal"
    );
  });

  it("não duplica o país", () => {
    expect(buildGeocodeQuery("Lisboa, Portugal")).toBe("Lisboa, Portugal");
  });

  it("tira o Nº da porta e deixa o ordinal do nome da rua", () => {
    expect(normalizeGeocodeAddress("RUA 1º DE MAIO, Nº1, São Martinho do Porto")).toBe(
      "RUA 1º DE MAIO, 1, São Martinho do Porto"
    );
    expect(extractPtPostcode("São Martinho do Porto, 2460-675")).toBe("2460-675");
  });

  it("ignora um ponto aproximado e fica com o da porta", () => {
    const coords = pickPreciseGoogleLocation([
      { geometry: { location_type: "APPROXIMATE", location: { lat: 39.5, lng: -9.1 } } },
      { geometry: { location_type: "ROOFTOP", location: { lat: 39.51, lng: -9.13 } } },
    ]);
    expect(coords).toEqual([39.51, -9.13]);
  });

  it("se a porta não existe, usa o centro da rua e não o da vila", () => {
    const coords = pickPreciseGoogleLocation([
      { geometry: { location_type: "APPROXIMATE", location: { lat: 39.5, lng: -9.1 } } },
      { geometry: { location_type: "GEOMETRIC_CENTER", location: { lat: 39.511, lng: -9.133 } } },
    ]);
    expect(coords).toEqual([39.511, -9.133]);
    expect(stripTrailingDoorNumber("Rua 1º de Maio 1, São Martinho do Porto, 2460-675, Portugal")).toBe(
      "Rua 1º de Maio, São Martinho do Porto, 2460-675, Portugal"
    );
  });

  it("aceita a rua quando o mapa não tem número de porta", () => {
    expect(
      nominatimStreetCoords({
        lat: "39.5110666",
        lon: "-9.1329040",
        class: "highway",
        addresstype: "residential",
        address: { road: "Rua 1º de Maio" },
      })
    ).toEqual([39.5110666, -9.132904]);
  });
});
