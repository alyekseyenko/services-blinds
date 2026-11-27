import "server-only";
import { crmFetch } from "../client";
import {
  CRM_TASK_STATUS,
  normalizeTaskStatus,
  toTwentyTaskStatus,
  classifyOpportunityWorkflowOnTaskClose,
  deriveWorkflowMarkerKey,
} from "../contract";
import { applyOpportunityStageTransition, resolveStageAfterTaskStatusChange } from "../pipelineTransitions";
import { invalidateAdminCrmCache } from "@/lib/crmCache";
import { shouldKeepOnSiteExtraOnParentClose } from "@/lib/visits/onSiteExtraClose";
import { assertRepairPaymentsBeforeClose, recordRepairPaymentNotes } from "@/lib/crm/repairPayments";
import { repairPaymentDisplayLabel, type RepairPaymentNote } from "@/lib/visits/repairPayment";
import { parseVisitServicesMarker } from "../visitServicesMarker";
import { mergeTaskBodyWithObservations } from "../visitServices";
import { appendSyncDoneMarker, hasSyncDoneMarker } from "../syncIdempotency";
import {
  buildTechnicianArrivedNotePt,
  buildTechnicianLeftSiteNotePt,
  formatTaskStatusPt,
} from "@/lib/taskStatusLabels";
import { recordVisitArrival, recordVisitDeparture } from "@/lib/visitSiteTimes";
import { offlineStatusConflict } from "@/lib/visits/statusConflict";
import { fetchOpportunityPipelineContext } from "./queries";

export async function updateTaskStatus(
  taskId: string,
  status: string,
  observations?: string,
  photos: string[] = [],
  clientRequestId?: string,
  occurredAtIso?: string,
  visitArrivedAtIso?: string,
  paymentNotes?: RepairPaymentNote[]
): Promise<any> {
  const apiStatus = normalizeTaskStatus(status);
  const twentyStatus = toTwentyTaskStatus(status);

  if (clientRequestId) {
    const existingTask = await crmFetch<{
      tasks: { edges: Array<{ node: { status?: string; bodyV2?: { markdown?: string } } }> };
    }>(
      `query taskSyncMarker($id: UUID!) {
        tasks(filter: { id: { eq: $id } }, first: 1) {
          edges { node { status bodyV2 { markdown } } }
        }
      }`,
      { id: taskId },
      { timeoutMs: 8000, maxRetries: 0 }
    );
    const node = existingTask.tasks.edges[0]?.node;
    const body = node?.bodyV2?.markdown || "";
    if (hasSyncDoneMarker(body, clientRequestId)) {
      return { id: taskId, success: true, idempotent: true };
    }
    const statusConflict = offlineStatusConflict(node?.status, status);
    if (statusConflict) {
      throw new Error(statusConflict);
    }
  }

  // 1. Update Task in CRM
  const mutation = `
    mutation updateT($id: UUID!, $data: TaskUpdateInput!) {
      updateTask(id: $id, data: $data) {
        id
        title
        status
        technicianName
        taskTargets {
          edges {
            node {
              targetOpportunityId
              opportunity {
                nsi
                name
                stage
                pointOfContact {
                  id
                  emails {
                    primaryEmail
                  }
                }
              }
            }
          }
        }
      }
    }
  `;

  let mergedBody = await mergeTaskBodyWithObservations(taskId, observations);
  const eventIso = occurredAtIso?.trim() || new Date().toISOString();
  if (apiStatus === CRM_TASK_STATUS.EM_CURSO) {
    mergedBody = recordVisitArrival(mergedBody || "", eventIso);
  }
  const closesVisitOnSite =
    apiStatus === CRM_TASK_STATUS.CONCLUIDO ||
    apiStatus === CRM_TASK_STATUS.DONE ||
    apiStatus === CRM_TASK_STATUS.INCOMPLETO ||
    apiStatus === CRM_TASK_STATUS.CANCELADO;
  if (apiStatus === CRM_TASK_STATUS.CONCLUIDO || apiStatus === CRM_TASK_STATUS.DONE) {
    await assertRepairPaymentsBeforeClose(taskId, paymentNotes);
    await recordRepairPaymentNotes(paymentNotes, null, clientRequestId);
  }
  if (closesVisitOnSite) {
    if (visitArrivedAtIso?.trim()) {
      mergedBody = recordVisitArrival(mergedBody || "", visitArrivedAtIso.trim());
    }
    mergedBody = recordVisitDeparture(mergedBody || "", eventIso);
  }
  if (clientRequestId && mergedBody) {
    mergedBody = appendSyncDoneMarker(mergedBody, clientRequestId);
  } else if (clientRequestId) {
    mergedBody = appendSyncDoneMarker("", clientRequestId);
  }

  const result = await crmFetch<any>(mutation, {
    id: taskId,
    data: {
      status: twentyStatus,
      bodyV2: mergedBody ? { markdown: mergedBody } : undefined
    }
  });

  const updatedTask = result.updateTask;
  if (!updatedTask) return { id: taskId, success: false };

  const visitMarker = parseVisitServicesMarker(mergedBody || "");
  const laterOppIds = new Set(
    visitMarker.filter((r) => r.mode === "later").map((r) => r.opportunityId)
  );
  const onSiteOppIds = new Set(visitMarker.map((r) => r.opportunityId));

  const oppTargetNodes =
    updatedTask.taskTargets?.edges
      ?.map((e: any) => e.node)
      .filter((n: any) => n?.targetOpportunityId) || [];

  const primaryTarget =
    oppTargetNodes.find((n: any) => !laterOppIds.has(n.targetOpportunityId)) ||
    oppTargetNodes[0];
  const oppId = primaryTarget?.targetOpportunityId as string | undefined;

  // Twenty often omits nested `opportunity` on updateTask — always refresh from CRM.
  const opp = oppId ? await fetchOpportunityPipelineContext(oppId) : null;
  const clientEmail = opp?.pointOfContact?.emails?.primaryEmail;
  const personId = opp?.pointOfContact?.id;

  // 2. Orchestrate Notifications and Reports (Side Effects)
  const { triggerNotification } = await import('../notifications');

  const isIncomplete = apiStatus === CRM_TASK_STATUS.INCOMPLETO;
  const isCompleted =
    apiStatus === CRM_TASK_STATUS.CONCLUIDO || apiStatus === CRM_TASK_STATUS.DONE;

  const n8nSideEffects: Promise<unknown>[] = [];

  if (isIncomplete) {
    n8nSideEffects.push(
      triggerNotification('technician_report', {
        taskId,
        status: apiStatus,
        observations,
        title: updatedTask.title,
        pointOfContactEmail: clientEmail
      })
    );
  }

  if (isCompleted || isIncomplete) {
    if (isCompleted) {
      n8nSideEffects.push(
        triggerNotification('service_completed', {
          taskId,
          opportunityId: oppId,
          title: updatedTask.title,
          pointOfContactEmail: clientEmail
        })
      );
    }

    const { serverTriggerServiceReport } = await import('@/lib/notificationAction');
    n8nSideEffects.push(
      serverTriggerServiceReport({
        taskId,
        opportunityId: oppId,
        status: apiStatus,
        observations,
        photos,
        nsi: opp?.nsi || 'NSI',
        clientName: opp?.name || 'Cliente',
        serviceType: deriveWorkflowMarkerKey(opp?.stage, updatedTask.title),
        taskTitle: updatedTask.title
      })
    );
  }

  if (n8nSideEffects.length > 0) {
    const results = await Promise.allSettled(n8nSideEffects);
    for (const result of results) {
      if (result.status === 'rejected') {
        console.warn('Falha ao enfileirar automação n8n (visita já gravada no CRM):', result.reason);
      }
    }
  }

  // 3. Criar uma nota nativa no CRM se houver observações/relatório do técnico para manter o histórico centralizado
  const { createOpportunityNote } = await import('../notes');
  const arrivalNoteOnly = /^t[eé]cnico chegou ao local\.?$/i.test((observations || "").trim());
  if (oppId && observations && observations.trim() && !arrivalNoteOnly) {
    try {
      const noteTitle = `Relatório técnico (${formatTaskStatusPt(status)})`;
      await createOpportunityNote(
        oppId,
        personId || null,
        noteTitle,
        observations,
        clientRequestId ? `${clientRequestId}-report` : undefined
      );
    } catch (noteErr) {
      console.warn('Failed to automatically create CRM Note for technician report:', noteErr);
    }
  }

  if (apiStatus === CRM_TASK_STATUS.EM_CURSO) {
    const arrivedNote = buildTechnicianArrivedNotePt(updatedTask.technicianName);
    const arrivalTargets = oppTargetNodes.length > 0
      ? oppTargetNodes
      : oppId
        ? [{ targetOpportunityId: oppId }]
        : [];
    for (const target of arrivalTargets) {
      const linkedOppId = target.targetOpportunityId as string;
      if (!linkedOppId) continue;
      try {
        await createOpportunityNote(
          linkedOppId,
          target.opportunity?.pointOfContact?.id ?? personId ?? null,
          arrivedNote.title,
          arrivedNote.body,
          clientRequestId ? `${clientRequestId}-arrived-${linkedOppId}` : undefined
        );
      } catch (noteErr) {
        console.warn(`[updateTaskStatus] Failed to create arrival note for ${linkedOppId}:`, noteErr);
      }
    }
  }

  const isVisitClosedOnSite =
    apiStatus === CRM_TASK_STATUS.CONCLUIDO ||
    apiStatus === CRM_TASK_STATUS.DONE ||
    apiStatus === CRM_TASK_STATUS.INCOMPLETO ||
    apiStatus === CRM_TASK_STATUS.CANCELADO;

  if (isVisitClosedOnSite && (oppTargetNodes.length > 0 || (paymentNotes?.length ?? 0) > 0)) {
    const notedIds = new Set<string>();
    for (const target of oppTargetNodes) {
      const linkedOppId = target.targetOpportunityId as string;
      if (!linkedOppId) continue;
      if (shouldKeepOnSiteExtraOnParentClose(apiStatus, onSiteOppIds.has(linkedOppId))) {
        continue;
      }
      notedIds.add(linkedOppId);
      const contactId =
        target.opportunity?.pointOfContact?.id ?? personId ?? null;
      const payment = paymentNotes?.find((note) => note.opportunityId === linkedOppId);
      const leftSiteNote = buildTechnicianLeftSiteNotePt(
        updatedTask.technicianName,
        apiStatus,
        payment
          ? repairPaymentDisplayLabel(payment.method, payment.detail)
          : undefined
      );
      try {
        await createOpportunityNote(
          linkedOppId,
          contactId,
          leftSiteNote.title,
          leftSiteNote.body,
          clientRequestId ? `${clientRequestId}-left-${linkedOppId}` : undefined
        );
      } catch (noteErr) {
        console.warn(
          `[updateTaskStatus] Failed to create left-site note for ${linkedOppId}:`,
          noteErr
        );
      }
    }

    if (isCompleted) {
      for (const payment of paymentNotes ?? []) {
        if (notedIds.has(payment.opportunityId)) continue;
        const leftSiteNote = buildTechnicianLeftSiteNotePt(
          updatedTask.technicianName,
          apiStatus,
          repairPaymentDisplayLabel(payment.method, payment.detail)
        );
        try {
          await createOpportunityNote(
            payment.opportunityId,
            personId || null,
            leftSiteNote.title,
            leftSiteNote.body,
            clientRequestId ? `${clientRequestId}-left-${payment.opportunityId}` : undefined
          );
        } catch (noteErr) {
          console.warn(
            `[updateTaskStatus] Failed to create payment exit note for ${payment.opportunityId}:`,
            noteErr
          );
        }
      }
    }
  }

  // 4. Stage transitions for each linked opportunity (skip "schedule later" on complete)
  if (apiStatus !== CRM_TASK_STATUS.EM_CURSO) {
    try {
      for (const target of oppTargetNodes) {
        const linkedOppId = target.targetOpportunityId as string;
        if (!linkedOppId) continue;

        if (
          laterOppIds.has(linkedOppId) &&
          (apiStatus === CRM_TASK_STATUS.CONCLUIDO || apiStatus === CRM_TASK_STATUS.DONE)
        ) {
          continue;
        }

        if (shouldKeepOnSiteExtraOnParentClose(apiStatus, onSiteOppIds.has(linkedOppId))) {
          continue;
        }

        const embeddedOpp = target.opportunity;
        const linkedOpp =
          embeddedOpp?.stage != null && embeddedOpp?.stage !== ""
            ? embeddedOpp
            : await fetchOpportunityPipelineContext(linkedOppId);
        if (!linkedOpp?.stage) continue;

        // On-site extra services follow their own stage, not the parent visit title.
        const closeTaskTitle = onSiteOppIds.has(linkedOppId) ? undefined : updatedTask.title;
        const workflow = classifyOpportunityWorkflowOnTaskClose(
          linkedOpp.stage,
          linkedOpp.name,
          closeTaskTitle
        );
        const targetStage = resolveStageAfterTaskStatusChange(
          workflow,
          apiStatus,
          linkedOpp.stage
        );
        if (!targetStage) continue;

        const reason =
          apiStatus === CRM_TASK_STATUS.CONCLUIDO || apiStatus === CRM_TASK_STATUS.DONE
            ? "task_completed"
            : "task_incomplete_or_cancelled";

        const stageResult = await applyOpportunityStageTransition(
          linkedOppId,
          targetStage,
          reason,
          {
            currentStage: linkedOpp.stage,
            taskStatus: apiStatus,
            opportunityName: linkedOpp.name,
            taskTitle: closeTaskTitle,
          }
        );
        if (stageResult.status === "conflict") {
          console.warn(
            "[Pipeline] Stage transition skipped after task update (conflict with CRM)",
            {
              opportunityId: linkedOppId,
              reason,
              crmStage: stageResult.currentStage,
              requestedTarget: stageResult.targetStage,
            }
          );
        }
      }
    } catch (stageErr) {
      console.warn('Failed to auto-update opportunity stage on task status change:', stageErr);
    }
  }

  await invalidateAdminCrmCache();
  return updatedTask;
}
