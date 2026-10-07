import "server-only";
import { crmManualCreatedBy, type CrmManualActor } from "./actor";
import { crmFetch, crmRestCreate } from "./client";
import type { AppNote } from "./appTypes";

export type { AppNote };

/**
 * Creates a native Note in Twenty CRM and associates it with an Opportunity (and optionally a Person).
 */
export async function createOpportunityNote(
  opportunityId: string,
  personId: string | null,
  title: string,
  bodyMarkdown: string,
  clientRequestId?: string,
  actor?: CrmManualActor
): Promise<{ id: string; title?: string }> {
  const { noteBodyWithSyncMarker } = await import("./syncIdempotency");
  if (clientRequestId) {
    let existingNotes: AppNote[];
    try {
      existingNotes = await fetchOpportunityNotes(opportunityId);
    } catch (error) {
      console.error("[createOpportunityNote] Idempotency lookup failed:", error);
      throw new Error("Não foi possível verificar notas existentes.");
    }
    const marker = `[NOTE_SYNC]${clientRequestId}`;
    if (existingNotes.some((n) => n.body.includes(marker))) {
      return { id: "idempotent", title };
    }
  }
  const bodyWithMarker = clientRequestId
    ? noteBodyWithSyncMarker(bodyMarkdown, clientRequestId)
    : bodyMarkdown;
  const noteTitle = title || "Instrução";
  const noteBody = { bodyV2: { markdown: bodyWithMarker } };

  if (actor?.workspaceMemberId && actor.name) {
    const createdBy = crmManualCreatedBy(actor);
    const note = await crmRestCreate<{ id: string }>("notes", {
      title: noteTitle,
      ...noteBody,
      createdBy,
    });

    if (note?.id) {
      if (opportunityId) {
        await crmRestCreate("noteTargets", {
          noteId: note.id,
          targetOpportunityId: opportunityId,
          createdBy,
        }).catch((err) =>
          console.error("[createOpportunityNote] Failed to link note to Opportunity:", err)
        );
      }
      if (personId) {
        await crmRestCreate("noteTargets", {
          noteId: note.id,
          targetPersonId: personId,
          createdBy,
        }).catch((err) =>
          console.error("[createOpportunityNote] Failed to link note to Person:", err)
        );
      }
    }

    return { id: note.id, title: noteTitle };
  }

  const createNoteMutation = `
    mutation createN($data: NoteCreateInput!) {
      createNote(data: $data) {
        id
        title
      }
    }
  `;

  const createTargetMutation = `
    mutation createNT($data: NoteTargetCreateInput!) {
      createNoteTarget(data: $data) {
        id
      }
    }
  `;

  const result = await crmFetch<{ createNote: { id: string; title?: string } }>(createNoteMutation, {
    data: {
      title: noteTitle,
      ...noteBody,
    },
  });

  const note = result.createNote;

  if (note?.id) {
    if (opportunityId) {
      await crmFetch(createTargetMutation, {
        data: {
          noteId: note.id,
          targetOpportunityId: opportunityId,
        },
      }).catch((err) =>
        console.error("[createOpportunityNote] Failed to link note to Opportunity:", err)
      );
    }

    if (personId) {
      await crmFetch(createTargetMutation, {
        data: {
          noteId: note.id,
          targetPersonId: personId,
        },
      }).catch((err) =>
        console.error("[createOpportunityNote] Failed to link note to Person:", err)
      );
    }
  }

  return note;
}

/**
 * Fetches all Notes associated with a given Opportunity.
 */
export async function fetchOpportunityNotes(opportunityId: string): Promise<AppNote[]> {
  const query = `
    query getOppNotes($id: UUID!) {
      opportunities(filter: { id: { eq: $id } }) {
        edges {
          node {
            id
            noteTargets {
              edges {
                node {
                  note {
                    id
                    title
                    createdAt
                    bodyV2 {
                      markdown
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  `;

  try {
    const data = await crmFetch<any>(query, { id: opportunityId });
    const edge = data?.opportunities?.edges?.[0];
    if (!edge) return [];

    const targets = edge.node?.noteTargets?.edges || [];
    const notesMap = new Map<string, AppNote>();

    for (const targetEdge of targets) {
      const note = targetEdge.node?.note;
      if (note && note.id && !notesMap.has(note.id)) {
        notesMap.set(note.id, {
          id: note.id,
          title: note.title || "",
          createdAt: note.createdAt,
          body: note.bodyV2?.markdown || ""
        });
      }
    }

    // Return unique notes sorted by date (newest first)
    return Array.from(notesMap.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  } catch (error) {
    console.error("[fetchOpportunityNotes] Error:", error);
    throw error;
  }
}
