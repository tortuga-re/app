"use client";

export const welcomeChestStartEvent = "tortuga:welcome-chest-start";

export const requestWelcomeChest = (identity?: { firstName: string; email: string }) => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(welcomeChestStartEvent, { detail: identity }));
};
