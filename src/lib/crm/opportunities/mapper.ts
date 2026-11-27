import "server-only";
import {
  CRM_STAGES,
  CRM_TASK_STATUS,
  STAGE_GROUPS,
  normalizeString,
  normalizeTaskStatus,
  isTaskActive,
  isTaskPendingConfirmation,
  isTaskBlockingSchedule,
  isTaskCompleted,
  isTaskCancelled,
  isTaskIncomplete,
  isTaskTerminal,
  isMeasurementService,
  isInstallationService,
  isAssistanceService,
  deriveWorkflowMarkerKey,
  CRM_ADDRESS_GRAPHQL_FIELDS,
  parseCrmClientRating,
} from "../contract";
import { isOpportunityCreatedOnSite, isOpportunityDeferredInTask } from "../visitServicesMarker";
import { onSiteExtraDisplaysAsCompleted } from "@/lib/visits/onSiteExtraClose";
import { formatNavigationAddressLine, formatServiceAddressLine } from "@/lib/visits/serviceAddressLine";
import { formatServiceNumber } from "../serviceNumber";
import { canonicalTechnicianName } from "@/lib/technicianIdentity";
import {
  formatOnSiteDurationPt,
  parseVisitSiteTimes,
  sumOnSiteDurationMsFromMarkers,
} from "@/lib/visitSiteTimes";
import { isTerminalHistoryStatus } from "../dateFilters";
import { extractPhonesFromTwenty, getPrimaryPhone } from "../phones";
import { normalizeClientNif } from "../clientNif";
import { opportunityEurosFromAmountMicros } from "../opportunityAmount";
import { resolveAppTeamFields } from "@/lib/visits/team";

export const OPPORTUNITY_ADMIN_NODE_FIELDS = `
  id
  name
  nsi
  numeroDeServico
  stage
  amount {
    amountMicros
    currencyCode
  }
  avaliacaoDoCliente
  feedbackDoCliente
  createdAt
  moradaDeServico {
    ${CRM_ADDRESS_GRAPHQL_FIELDS}
  }
  pointOfContact {
    id
    name {
      firstName
      lastName
    }
    emails {
      primaryEmail
    }
    nif
    phones {
      primaryPhoneNumber
      primaryPhoneCallingCode
      additionalPhones {
        number
        callingCode
        countryCode
      }
    }
  }
  taskTargets {
    edges {
      node {
        task {
          id
          status
          dueAt
          horaDeFim
          assigneeId
          technicianName
          equipaAuxiliarIds
          equipaAuxiliarNomes
          scheduledBy
          bodyV2 { markdown }
        }
      }
    }
  }
`;
export type CrmTaskNode = {
  id: string;
  status?: string;
  dueAt?: string | null;
  horaDeFim?: string | null;
  assigneeId?: string | null;
  technicianName?: string | null;
  equipaAuxiliarIds?: string | null;
  equipaAuxiliarNomes?: string | null;
  scheduledBy?: string | null;
  title?: string | null;
  bodyV2?: { markdown?: string | null } | null;
};

/** Escolhe a tarefa que define o mapa: uma visita ativa (agendada ou em curso) ganha a uma conclusão antiga. */
export function pickRepresentativeTaskForOpportunity(
  tasks: CrmTaskNode[]
): CrmTaskNode | null {
  if (tasks.length === 0) return null;

  const activeTasks = tasks.filter((t) => isTaskActive(t.status));
  if (activeTasks.length > 0) {
    return [...activeTasks].sort((a, b) => {
      const dueB = new Date(b.dueAt || 0).getTime();
      const dueA = new Date(a.dueAt || 0).getTime();
      return dueB - dueA;
    })[0];
  }

  const outcomeTerminal = tasks.filter(
    (t) => isTaskCompleted(t.status) || isTaskIncomplete(t.status)
  );
  if (outcomeTerminal.length > 0) {
    const terminalRank = (status?: string) => {
      if (isTaskCompleted(status)) return 3;
      if (isTaskIncomplete(status)) return 2;
      return 0;
    };
    return [...outcomeTerminal].sort((a, b) => {
      const rank = terminalRank(b.status) - terminalRank(a.status);
      if (rank !== 0) return rank;
      const dueB = new Date(b.dueAt || 0).getTime();
      const dueA = new Date(a.dueAt || 0).getTime();
      return dueB - dueA;
    })[0];
  }

  const openTasks = tasks.filter((t) => !isTaskTerminal(t.status));
  if (openTasks.length > 0) {
    const taskStatusPriority = (status: string) => {
      const s = normalizeTaskStatus(status);
      if (s === CRM_TASK_STATUS.AGENDADO) return 5;
      if (s === CRM_TASK_STATUS.POR_AGENDAR) return 4;
      if (s === CRM_TASK_STATUS.EM_CURSO) return 4;
      return 1;
    };
    return [...openTasks].sort(
      (a, b) => taskStatusPriority(b.status || "") - taskStatusPriority(a.status || "")
    )[0];
  }

  const cancelledOnly = tasks.filter((t) => isTaskCancelled(t.status));
  if (cancelledOnly.length > 0) {
    return [...cancelledOnly].sort((a, b) => {
      const dueB = new Date(b.dueAt || 0).getTime();
      const dueA = new Date(a.dueAt || 0).getTime();
      return dueB - dueA;
    })[0];
  }

  const taskStatusPriority = (status: string) => {
    const s = normalizeTaskStatus(status);
    if (s === CRM_TASK_STATUS.AGENDADO) return 5;
    if (s === CRM_TASK_STATUS.POR_AGENDAR) return 4;
    if (s === CRM_TASK_STATUS.EM_CURSO) return 4;
    if (s === CRM_TASK_STATUS.INCOMPLETO) return 3;
    if (s === CRM_TASK_STATUS.CONCLUIDO || s === CRM_TASK_STATUS.DONE) return 2;
    return 1;
  };

  return [...tasks].sort((a, b) => taskStatusPriority(b.status || "") - taskStatusPriority(a.status || ""))[0];
}

export const UNASSIGNED_TECHNICIAN_LABEL = "Não Atribuído";

function taskHasAssignee(task: CrmTaskNode | null | undefined): boolean {
  return Boolean(task?.technicianName?.trim() || task?.assigneeId);
}

/**
 * Who did / owns the visit for history and filters.
 * Do not blank the name when the representative task is obsolete for the map
 * (stage already past that visit) — history still needs the technician.
 */
export function resolveOpportunityTechnician(
  representative: CrmTaskNode | null,
  allTasks: CrmTaskNode[]
): { technician: string; technicianId: string | null; scheduledBy?: string } {
  const fallback = [...allTasks]
    .filter((task) => task.id !== representative?.id)
    .sort((a, b) => new Date(b.dueAt || 0).getTime() - new Date(a.dueAt || 0).getTime())
    .find(taskHasAssignee);
  const named = taskHasAssignee(representative) ? representative : fallback ?? null;

  return {
    technician: canonicalTechnicianName(named?.technicianName) || UNASSIGNED_TECHNICIAN_LABEL,
    technicianId: named?.assigneeId ?? null,
    scheduledBy: named?.scheduledBy || representative?.scheduledBy || undefined,
  };
}

export function mapOpportunityNode(node: any) {
  const contact = node.pointOfContact;
  const allTasks = (node.taskTargets?.edges?.map((e: any) => e.node?.task).filter(Boolean) || [])
    .filter((t: any) => !isOpportunityDeferredInTask(node.id, t.bodyV2?.markdown)) as CrmTaskNode[];

  const task = pickRepresentativeTaskForOpportunity(allTasks);

  const createdOnSite = (node.taskTargets?.edges || []).some((e: any) =>
    isOpportunityCreatedOnSite(node.id, e.node?.task?.bodyV2?.markdown)
  );
  const deferredOnSite = (node.taskTargets?.edges || []).some((e: any) =>
    isOpportunityDeferredInTask(node.id, e.node?.task?.bodyV2?.markdown)
  );

  let isTaskObsolete = false;
  if (task && isTaskActive(task.status)) {
    const stageNorm = normalizeString(node.stage);

    const isMeasurement = isMeasurementService(node.stage, task.title);
    const isInstallation = isInstallationService(node.stage, task.title);
    const isAssistance = isAssistanceService(node.stage, task.title);

    if (isMeasurement && STAGE_GROUPS.OBSOLETE_AFTER_MEASUREMENT.includes(stageNorm)) {
      isTaskObsolete = true;
    }

    if (isInstallation && STAGE_GROUPS.OBSOLETE_AFTER_INSTALLATION.includes(stageNorm)) {
      isTaskObsolete = true;
    }

    if (isAssistance && STAGE_GROUPS.OBSOLETE_AFTER_ASSISTANCE.includes(stageNorm)) {
      isTaskObsolete = true;
    }
  }

  let computedStatus = node.stage;
  if (task) {
    const taskStatusNormalized = normalizeTaskStatus(task.status);
    if (taskStatusNormalized === CRM_TASK_STATUS.CONCLUIDO || taskStatusNormalized === CRM_TASK_STATUS.DONE) {
      computedStatus = CRM_TASK_STATUS.CONCLUIDO;
    } else if (taskStatusNormalized === CRM_TASK_STATUS.CANCELADO) {
      computedStatus = CRM_TASK_STATUS.CANCELADO;
    } else if (taskStatusNormalized === CRM_TASK_STATUS.INCOMPLETO) {
      computedStatus = CRM_TASK_STATUS.INCOMPLETO;
    } else if (taskStatusNormalized === CRM_TASK_STATUS.EM_CURSO) {
      computedStatus = CRM_TASK_STATUS.EM_CURSO;
    } else if (taskStatusNormalized === CRM_TASK_STATUS.AGENDADO) {
      computedStatus = CRM_TASK_STATUS.AGENDADO;
    } else if (taskStatusNormalized === CRM_TASK_STATUS.POR_AGENDAR) {
      computedStatus = CRM_TASK_STATUS.POR_AGENDAR;
    }
  }

  const stageNorm = normalizeString(node.stage);
  const finishedOnSiteDespiteParent = onSiteExtraDisplaysAsCompleted({
    createdOnSite,
    deferred: deferredOnSite,
    stage: node.stage,
    inheritedStatus: computedStatus,
  });
  if (finishedOnSiteDespiteParent) {
    computedStatus = CRM_TASK_STATUS.CONCLUIDO;
  } else if (
    (stageNorm === CRM_STAGES.PAGAMENTO_TOTAL || stageNorm === CRM_STAGES.CONCLUIDO) &&
    !isTerminalHistoryStatus(computedStatus)
  ) {
    computedStatus = CRM_TASK_STATUS.CONCLUIDO;
  } else if (stageNorm === 'CANCELADO' && !isTerminalHistoryStatus(computedStatus)) {
    computedStatus = CRM_TASK_STATUS.CANCELADO;
  }

  const pointOfContactPhones = extractPhonesFromTwenty(contact?.phones);

  const visitSiteTimes = task ? parseVisitSiteTimes(task.bodyV2?.markdown) : {};
  const visitOnSiteDurationMs = sumOnSiteDurationMsFromMarkers(
    allTasks.map((t) => t.bodyV2?.markdown)
  );

  const teamSource = taskHasAssignee(task) ? task : allTasks.find(taskHasAssignee) ?? task;
  const teamFields = resolveAppTeamFields({
    assigneeId: teamSource?.assigneeId,
    technicianName: teamSource?.technicianName,
    equipaAuxiliarIds: teamSource?.equipaAuxiliarIds,
    equipaAuxiliarNomes: teamSource?.equipaAuxiliarNomes,
  });

  return {
    id: node.id,
    twentyId: node.id,
    title: node.name,
    stage: node.stage,
    status: computedStatus,
    dueDate: node.createdAt,
    address: formatServiceAddressLine(node.moradaDeServico, "N/A"),
    navigationAddress: formatNavigationAddressLine(node.moradaDeServico, "N/A"),
    addressCity: node.moradaDeServico?.addressCity || "Outros",
    coordinates:
      node.moradaDeServico?.addressLat != null &&
      node.moradaDeServico?.addressLng != null &&
      Number.isFinite(node.moradaDeServico.addressLat) &&
      Number.isFinite(node.moradaDeServico.addressLng)
        ? [node.moradaDeServico.addressLat, node.moradaDeServico.addressLng]
        : null,
    rawAddress: node.moradaDeServico,
    pointOfContactId: contact?.id,
    pointOfContactEmail: contact?.emails?.primaryEmail,
    pointOfContactPhone: getPrimaryPhone(pointOfContactPhones),
    pointOfContactPhones,
    clientNif: normalizeClientNif(contact),
    client: contact ? `${contact.name?.firstName || ""} ${contact.name?.lastName || ""}`.trim() : "Cliente",
    hasScheduledTask: !!task && isTaskActive(task.status) && !isTaskObsolete,
    hasPendingProposal:
      !!task && isTaskPendingConfirmation(task.status) && !isTaskObsolete,
    taskStatus: isTaskObsolete || finishedOnSiteDespiteParent ? "CONCLUIDO" : task?.status,
    taskId: task?.id,
    scheduledAt:
      isTaskObsolete || !task
        ? null
        : isTaskBlockingSchedule(task.status)
          ? task.dueAt
          : null,
    scheduledEndAt:
      isTaskObsolete || !task || !isTaskBlockingSchedule(task.status)
        ? null
        : task.horaDeFim ?? null,
    historyAt: task?.dueAt || visitSiteTimes.closedAt || node.createdAt,
    ...resolveOpportunityTechnician(task, allTasks),
    assistantTechnicianIds: teamFields.assistantTechnicianIds,
    assistantTechnicianNames: teamFields.assistantTechnicianNames,
    teamSize: teamFields.teamSize,
    nsi: node.nsi != null && String(node.nsi).trim() !== "" ? String(node.nsi).trim() : "N/A",
    serviceNumber: formatServiceNumber(node.numeroDeServico),
    serviceType: deriveWorkflowMarkerKey(node.stage, node.name),
    createdOnSite,
    visitArrivedAt: visitSiteTimes.arrivedAt ?? null,
    visitClosedAt: visitSiteTimes.closedAt ?? null,
    visitOnSiteDurationMs,
    visitOnSiteDurationLabel:
      visitOnSiteDurationMs != null ? formatOnSiteDurationPt(visitOnSiteDurationMs) : null,
    clientRating: parseCrmClientRating(node.avaliacaoDoCliente) ?? undefined,
    clientFeedback:
      typeof node.feedbackDoCliente === "string" && node.feedbackDoCliente.trim()
        ? node.feedbackDoCliente.trim()
        : undefined,
    amount: opportunityEurosFromAmountMicros(
      (node.amount as { amountMicros?: unknown } | null | undefined)?.amountMicros
    ),
  };
}
