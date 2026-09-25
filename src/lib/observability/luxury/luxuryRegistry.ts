/**
 * Luxury Workflow E2E scenario registry.
 * Add new scenarios here when shipping new end-to-end business flows.
 * See docs/E2E_OBSERVABILITY_SUITE.md
 */
import type { LuxuryWorkflowScenario } from "./luxuryTypes";
import { brazilFullWorkflowScenario } from "./scenarios/brazilFullWorkflow";

export const LUXURY_WORKFLOW_REGISTRY: LuxuryWorkflowScenario[] = [
  brazilFullWorkflowScenario,
];

export function getLuxuryScenario(id: string): LuxuryWorkflowScenario | undefined {
  return LUXURY_WORKFLOW_REGISTRY.find((scenario) => scenario.id === id);
}

export function listLuxuryScenarios(): Array<{
  id: string;
  name: string;
  description: string;
  n8nEventsCovered: string[];
}> {
  return LUXURY_WORKFLOW_REGISTRY.map((scenario) => ({
    id: scenario.id,
    name: scenario.name,
    description: scenario.description,
    n8nEventsCovered: scenario.n8nEventsCovered,
  }));
}
