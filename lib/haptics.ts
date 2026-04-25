"use client";

export const triggerHaptic = (duration = 10) => {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") {
    return;
  }

  navigator.vibrate(duration);
};
