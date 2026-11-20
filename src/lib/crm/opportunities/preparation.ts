import "server-only";
import { crmFetch } from "../client";
import { formatServiceNumber } from "../serviceNumber";

export async function fetchPreparationList() {
  const {
    fetchLatestMeasurementLinesForOpportunities,
    mergeCrmPrepWithMeasurementLines,
  } = await import("@/lib/measurements/warehouseQueries");

  const query = `
    query getPrepList {
      opportunities(filter: { stage: { eq: "PREPARACAO" } }, orderBy: { createdAt: DescNullsLast }, first: 100) {
        edges {
          node {
            id
            name
            nsi
            numeroDeServico
            stage
            createdAt
            pointOfContact {
              name {
                firstName
                lastName
              }
            }
            taskTargets {
              edges {
                node {
                  task {
                    id
                    status
                  }
                }
              }
            }
          }
        }
      }
    }
  `;

  const data = await crmFetch<{ opportunities: { edges: any[] } }>(query);

  const crmOpportunities = data.opportunities.edges.map((edge) => {
    const node = edge.node;
    const contact = node.pointOfContact;
    return {
      id: node.id,
      name: node.name,
      nsi: node.nsi != null && String(node.nsi).trim() !== "" ? String(node.nsi).trim() : "N/A",
      serviceNumber: formatServiceNumber(node.numeroDeServico),
      createdAt: node.createdAt,
      client: contact
        ? `${contact.name?.firstName || ""} ${contact.name?.lastName || ""}`.trim()
        : "Cliente",
      taskId: node.taskTargets?.edges?.[0]?.node?.task?.id as string | undefined,
    };
  });

  const linesByOpp = await fetchLatestMeasurementLinesForOpportunities(
    crmOpportunities.map((o) => o.id)
  );

  return mergeCrmPrepWithMeasurementLines(crmOpportunities, linesByOpp);
}
