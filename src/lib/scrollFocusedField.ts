/** Keep focused inputs visible above the mobile keyboard. */
export function scrollFocusedFieldIntoView(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return;
  if (!/^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
  window.requestAnimationFrame(() => {
    target.scrollIntoView({ block: "center", behavior: "smooth" });
  });
}
