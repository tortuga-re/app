export const scrollToFormField = (element?: HTMLElement | null) => {
  if (!element) {
    return;
  }

  element.scrollIntoView({
    behavior: "smooth",
    block: "center",
  });

  window.setTimeout(() => {
    if ("focus" in element && typeof element.focus === "function") {
      element.focus({ preventScroll: true });
    }
  }, 250);
};
