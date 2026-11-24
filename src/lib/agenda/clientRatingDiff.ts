export type ClientRatingNotice = {
  opportunityId: string;
  taskId?: string;
  dueAt?: string;
  clientName: string;
  serviceNumber?: string;
  nsi?: string;
  rating: number;
  feedback?: string;
  assigneeId?: string;
  technicianName?: string;
};

export function clientRatingFingerprint(item: Pick<ClientRatingNotice, "rating" | "feedback">): string {
  return `${item.rating}|${item.feedback?.trim() ?? ""}`;
}

/** Primeira leitura só memoriza. Depois avisa quando a nota ou o comentário mudam. */
export function diffClientRatings(
  previous: ClientRatingNotice[] | null,
  next: ClientRatingNotice[]
): ClientRatingNotice[] {
  if (previous === null) return [];
  const seen = new Map(previous.map((item) => [item.opportunityId, clientRatingFingerprint(item)]));
  return next.filter((item) => seen.get(item.opportunityId) !== clientRatingFingerprint(item));
}

export function formatClientRatingNotice(item: ClientRatingNotice): {
  title: string;
  description: string;
} {
  const who = [
    item.clientName.trim() || "Cliente",
    item.serviceNumber ? `N.º ${item.serviceNumber}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const stars = item.rating === 1 ? "1 estrela" : `${item.rating} estrelas`;
  const comment = item.feedback?.trim();
  return {
    title: "Avaliação do cliente",
    description: [who, stars, comment].filter(Boolean).join(" · "),
  };
}
