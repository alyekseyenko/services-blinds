/** Browser connectivity (DNS may still fail when this is true). */
export function isBrowserOnline(): boolean {
  if (typeof navigator === "undefined") return true;
  return navigator.onLine;
}
