"use server";

import { canAccessAdminPanel } from "@/lib/auth/session";
import { getAppSession } from "@/lib/auth/session.server";
import { saveLearning } from "./agentMemory";
import { semanticAiCache } from "./ai/semanticCache";
import { euclideanKm, normalizeLocationKey, resolveCityKeyFromOpportunity } from "@/lib/admin/geo";
import { isNeedsSchedulingStage } from "@/lib/crm/contract";
import { COMPANY_LABEL } from "./branding";
import { getHqLocation } from "./hq";
import type { ZoneInsight } from "@/types/admin";

const HQ_LOCATION = getHqLocation();

export interface ExpertAgentOpportunity {
  stage?: string;
  hasScheduledTask?: boolean;
  scheduledAt?: string | Date | null;
  dueDate?: string | Date | null;
  coordinates?: [number, number] | null;
  addressCity?: string;
  address?: string;
  client?: string;
  title?: string;
}

export interface ExpertAgentContext {
  opportunities: ExpertAgentOpportunity[];
  zoneInsights?: ZoneInsight[];
  currentRoute?: unknown[];
}

export interface ExpertAgentResponse {
  message: string;
  timestamp: string;
  agentThought?: string;
  isLearning?: boolean;
  fromCache?: boolean;
  error?: string;
}

function isPendingOpportunity(opp: ExpertAgentOpportunity): boolean {
  return isNeedsSchedulingStage(opp.stage) && !opp.hasScheduledTask;
}

function daysWaiting(opp: ExpertAgentOpportunity): number {
  const base = opp.dueDate ? new Date(opp.dueDate).getTime() : Date.now();
  return Math.ceil(Math.abs(Date.now() - base) / (1000 * 60 * 60 * 24));
}

function countPendingInCity(
  opportunities: ExpertAgentOpportunity[],
  cityKey: string | null
): ExpertAgentOpportunity[] {
  if (!cityKey) return [];
  return opportunities.filter((opp) => {
    if (!isPendingOpportunity(opp)) return false;
    const { key } = resolveCityKeyFromOpportunity(opp);
    return key === cityKey;
  });
}

/**
 * Logistics expert agent with semantic cache and CRM-backed responses.
 */
export async function askExpertAgent(
  userMessage: string,
  context: ExpertAgentContext
): Promise<ExpertAgentResponse> {
  try {
    const ctx = await getAppSession();
    if (!ctx?.user.role || !canAccessAdminPanel(ctx.user.role)) {
      return {
        message: "Acesso não autorizado.",
        timestamp: new Date().toISOString(),
        error: "Acesso não autorizado.",
      };
    }

    const { opportunities, zoneInsights = [], currentRoute = [] } = context;
    const msg = userMessage.toLowerCase();

    let learningDetected = null;
    const isLearningPrompt =
      msg.includes("remember") ||
      msg.includes("save") ||
      msg.includes("learn") ||
      msg.includes("prefer") ||
      msg.includes("lembra-te") ||
      msg.includes("guarda") ||
      msg.includes("aprende") ||
      msg.includes("prefere");

    if (isLearningPrompt) {
      const insight = userMessage
        .replace(/remember that|remember|save that|save|learn that|learn|lembra-te que|lembra-te|guarda que|aprende que/gi, "")
        .trim();
      learningDetected = await saveLearning("business", insight);
      semanticAiCache.clear();
    } else {
      const cached = semanticAiCache.get<ExpertAgentResponse>(userMessage);
      if (cached) {
        return { ...cached, fromCache: true, timestamp: new Date().toISOString() };
      }
    }

    const pendingOpportunities = opportunities.filter(isPendingOpportunity);
    const waiters = pendingOpportunities
      .map((opp) => ({ ...opp, days: daysWaiting(opp) }))
      .sort((a, b) => b.days - a.days);

    const reaction = {
      observation: `User asked: "${userMessage}"`,
      reasoning: "",
      plan: "",
      finalResponse: "",
    };

    const targetCityKey =
      zoneInsights.find((insight) => msg.includes(normalizeLocationKey(insight.name)))?.key ??
      pendingOpportunities
        .map((opp) => resolveCityKeyFromOpportunity(opp))
        .find(({ key, display }) => msg.includes(key) || msg.includes(normalizeLocationKey(display)))
        ?.key ??
      null;

    const targetCityName =
      zoneInsights.find((insight) => insight.key === targetCityKey)?.name ??
      pendingOpportunities
        .map((opp) => resolveCityKeyFromOpportunity(opp))
        .find(({ key }) => key === targetCityKey)?.display ??
      "Unknown zone";

    if (
      msg.includes("route") ||
      msg.includes("way") ||
      msg.includes("caminho") ||
      msg.includes("trajeto") ||
      msg.includes("passando")
    ) {
      const start = HQ_LOCATION.coordinates;
      const targetOpp = pendingOpportunities.find((opp) => {
        const { key } = resolveCityKeyFromOpportunity(opp);
        return targetCityKey ? key === targetCityKey : false;
      });
      const end = targetOpp?.coordinates ?? start;

      const waypoints = pendingOpportunities.filter((opp) => {
        if (!opp.coordinates) return false;
        const [lat, lng] = opp.coordinates;
        const minLat = Math.min(start[0], end[0]) - 0.05;
        const maxLat = Math.max(start[0], end[0]) + 0.05;
        const minLng = Math.min(start[1], end[1]) - 0.05;
        const maxLng = Math.max(start[1], end[1]) + 0.05;
        return lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng;
      });

      reaction.reasoning = `Corridor search HQ -> ${targetCityName}. Found ${waypoints.length} possible stops. Active route has ${currentRoute.length} stops.`;
      reaction.finalResponse =
        `OPPORTUNITIES ON THE WAY: ${targetCityName}\n` +
        "──────────────────────\n" +
        (waypoints.length > 0
          ? waypoints
              .slice(0, 4)
              .map((w, i) => `${i + 1}. ${w.client}\n   ${w.addressCity} (${w.title})`)
              .join("\n\n") +
            `\n\nSUGGESTION: ${waypoints.length} pending services can be bundled into this trip, improving trip ROI by about ${(waypoints.length * 45).toFixed(0)}€.`
          : "No pending services were found along the main corridor for this zone.");
    } else if (msg.includes("cost") || msg.includes("quanto custa") || msg.includes("custo")) {
      const zoneOpps = countPendingInCity(pendingOpportunities, targetCityKey);
      const referenceCoords = zoneOpps.find((opp) => opp.coordinates)?.coordinates ?? HQ_LOCATION.coordinates;
      const oneWayKm = euclideanKm(referenceCoords, HQ_LOCATION.coordinates);
      const totalKm = oneWayKm * 2;

      const consumptionMatch = msg.match(/(\d+[.,]?\d*)\s*(l|consumption|consome|queima)/i);
      const priceMatch = msg.match(/(\d+[.,]?\d*)\s*(€|euro|price|preço)/i);
      const consumption = consumptionMatch ? parseFloat(consumptionMatch[1].replace(",", ".")) : 7.0;
      const price = priceMatch ? parseFloat(priceMatch[1].replace(",", ".")) : 1.9;
      const fuelCost = (totalKm / 100) * consumption * price;
      const tolls = oneWayKm > 50 ? 15 : 0;
      const total = fuelCost + tolls;

      reaction.reasoning = `ROI analysis for ${targetCityName}. Found ${zoneOpps.length} pending jobs in zone.`;
      reaction.finalResponse =
        `VIABILITY ANALYSIS: ${targetCityName}\n` +
        "──────────────────────\n" +
        `Distance: ${totalKm.toFixed(0)} km (round trip)\n` +
        `Fuel: ${fuelCost.toFixed(2)}€\n` +
        `Tolls (est.): ${tolls.toFixed(2)}€\n\n` +
        `TOTAL TRIP COST: ${total.toFixed(2)}€\n` +
        `PENDING IN ZONE: ${zoneOpps.length}\n\n` +
        `EXPERT VERDICT:\n` +
        (zoneOpps.length >= Math.ceil(total / 40)
          ? `Profitable: ${zoneOpps.length} pending jobs in ${targetCityName} cover the ${total.toFixed(2)}€ trip cost. Recommend planning a route now.`
          : `Hold: only ${zoneOpps.length} pending jobs in ${targetCityName}. You would need at least ${Math.ceil(total / 40)} jobs to justify ${total.toFixed(2)}€.`);
    } else if (
      msg.includes("wait") ||
      msg.includes("waiting") ||
      msg.includes("espera") ||
      msg.includes("tempo") ||
      msg.includes("who") ||
      msg.includes("quem")
    ) {
      const topZones = zoneInsights.slice(0, 2).map((z) => z.name).join(", ");
      const top3 = waiters.slice(0, 3);

      reaction.reasoning = `Waiting-time analysis across ${waiters.length} pending opportunities.`;
      reaction.finalResponse =
        `CRM PRIORITY REPORT\n` +
        "──────────────────────\n" +
        (top3.length > 0
          ? top3
              .map((o, i) => `${i + 1}. ${o.client}\n   ${o.addressCity || "Unknown city"} | ${o.days} days waiting`)
              .join("\n\n")
          : "No pending opportunities are waiting for scheduling.") +
        (topZones
          ? `\n\nSTRATEGY: Prioritize ${topZones} based on current zone density and logistics score.`
          : "");
    } else if (msg.includes("zone") || msg.includes("zona")) {
      reaction.reasoning = "Surfacing ranked zone insights from the Strategic Hub.";
      reaction.finalResponse =
        zoneInsights.length > 0
          ? `TOP SUGGESTED ZONES\n` +
            "──────────────────────\n" +
            zoneInsights
              .slice(0, 5)
              .map(
                (zone, i) =>
                  `${i + 1}. ${zone.name} — ${zone.count} pending, ${zone.distance}km, impact ${zone.impact}`
              )
              .join("\n")
          : "No ranked zones are available right now. Sync addresses or relax filters.";
    } else if (learningDetected) {
      reaction.reasoning = "Persisted a new business rule to agent memory.";
      reaction.finalResponse =
        `MEMORY UPDATED\n` +
        "──────────────────────\n" +
        `Saved rule: "${learningDetected.insight}"\n\n` +
        "This preference will be considered in future logistics answers.";
    } else {
      reaction.reasoning = "Default onboarding response.";
      reaction.finalResponse =
        `${COMPANY_LABEL} LOGISTICS EXPERT\n` +
        "──────────────────────\n" +
        "I analyze live CRM data for routes, costs, and priorities.\n\n" +
        "Try asking:\n" +
        '• "How much does a trip to Lisbon cost with 6L consumption?"\n' +
        '• "Who has been waiting the longest?"\n' +
        '• "Which zones should we prioritize?"\n' +
        '• "Remember that technicians do not work on Sundays."';
    }

    const finalResult: ExpertAgentResponse = {
      message: reaction.finalResponse,
      timestamp: new Date().toISOString(),
      agentThought: reaction.reasoning,
      isLearning: !!learningDetected,
    };

    if (!learningDetected) {
      semanticAiCache.set(userMessage, finalResult);
    }

    return finalResult;
  } catch (error) {
    console.error("Expert Agent Error:", error);
    return {
      message: "The logistics expert could not process your request.",
      timestamp: new Date().toISOString(),
      error: "The logistics expert could not process your request.",
    };
  }
}
