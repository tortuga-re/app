"use client";

/**
 * Haptic patterns for the Buzzer Live module.
 * Mostly supported on Android/Chrome. 
 * Safari/iOS does not support navigator.vibrate.
 */

export const VIBRATION_PATTERNS = {
  BUZZ_SENT: 80,
  CALL_TO_ACTION: [120, 60, 120],
  CORRECT_ANSWER: [80, 40, 80, 40, 160],
  WRONG_ANSWER: 250,
  ROUND_ENDED: [100, 50, 100, 50, 200],
};

export const triggerBuzzerVibration = (pattern: number | number[]) => {
  if (typeof window === "undefined") return;
  
  if ("vibrate" in navigator && typeof navigator.vibrate === "function") {
    try {
      navigator.vibrate(pattern);
    } catch (e) {
      // Ignore vibration errors
      console.warn("Vibration not supported or failed", e);
    }
  }
};
