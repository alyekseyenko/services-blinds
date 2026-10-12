/** Pure helpers for streaming STT partial/final segments (client + server). */

export function combineStreamTranscript(finals: string[], interim: string): string {
  const head = finals.map((f) => f.trim()).filter(Boolean).join(" ");
  const tail = interim.trim();
  if (!head) return tail;
  if (!tail) return head;
  return `${head} ${tail}`;
}
