import { describe, it, expect } from "vitest";

import { computeZoneInsights, countUnscheduledWithoutGps } from "../zoneInsights";

import type { Opportunity } from "@/types/admin";



const HQ: [number, number] = [38.72, -9.14];



function makeOpp(overrides: Partial<Opportunity> = {}): Opportunity {

  return {

    id: "1",

    twentyId: "tw-1",

    title: "Test",

    client: "Client",

    address: "Rua X, Lisboa",

    coordinates: [38.73, -9.15],

    stage: "ENTRADA",

    status: "Open",

    scheduledAt: null,

    dueDate: new Date(),

    hasScheduledTask: false,

    taskStatus: "",

    taskId: "",

    addressCity: "Lisboa",

    ...overrides,

  };

}



describe("computeZoneInsights", () => {

  it("returns empty array when no opportunities", () => {

    expect(computeZoneInsights([], HQ)).toEqual([]);

  });



  it("groups unscheduled opportunities by city", () => {

    const insights = computeZoneInsights(

      [

        makeOpp({ id: "1", addressCity: "Lisboa" }),

        makeOpp({ id: "2", addressCity: "Lisboa" }),

        makeOpp({ id: "3", addressCity: "Porto", coordinates: [41.15, -8.61] }),

      ],

      HQ

    );



    expect(insights.length).toBeGreaterThanOrEqual(2);

    const lisboa = insights.find((z) => z.name === "Lisboa");

    expect(lisboa?.count).toBe(2);

    expect(lisboa?.impact).toBeDefined();

    expect(lisboa?.key).toBe("lisboa");

  });



  it("excludes already scheduled opportunities", () => {

    const insights = computeZoneInsights([makeOpp({ hasScheduledTask: true })], HQ);

    expect(insights).toEqual([]);

  });



  it("respects category filter", () => {

    const insights = computeZoneInsights(

      [

        makeOpp({ id: "1", stage: "ENTRADA", title: "Medição técnica" }),

        makeOpp({ id: "2", stage: "MARCAR_INSTALACAO", title: "Instalação persiana" }),

      ],

      HQ,

      { serviceTypeFilters: ["TIRAR_MEDIDAS"] }

    );



    expect(insights).toHaveLength(1);

    expect(insights[0].count).toBe(1);

  });



  it("uses provided fuel settings for logistics cost", () => {

    const defaultInsights = computeZoneInsights([makeOpp()], HQ);

    const expensiveFuel = computeZoneInsights([makeOpp()], HQ, {

      fuelPrice: 3,

      fuelConsumption: 10,

    });



    expect(expensiveFuel[0].logisticsCost).toBeGreaterThan(defaultInsights[0].logisticsCost);

  });

});



describe("countUnscheduledWithoutGps", () => {

  it("counts pending opportunities missing coordinates", () => {

    const count = countUnscheduledWithoutGps([

      makeOpp({ id: "1", coordinates: null }),

      makeOpp({ id: "2", coordinates: [38.73, -9.15] }),

      makeOpp({ id: "3", hasScheduledTask: true, coordinates: null }),

    ]);



    expect(count).toBe(1);

  });

});


