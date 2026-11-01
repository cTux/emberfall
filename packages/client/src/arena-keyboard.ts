export function inputBlocked() {
  return (
    !!document.querySelector('[role="dialog"][aria-modal="true"]') ||
    !!document.querySelector('[role="menu"]') ||
    document.hidden ||
    document.activeElement instanceof HTMLInputElement ||
    document.activeElement instanceof HTMLTextAreaElement
  );
}
