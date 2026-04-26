"use client";

import { useEffect } from "react";

const hashHighlightClass = "hash-target-highlight";
const retryDelayMs = 120;
const maxAttempts = 18;
const scrollOffsetPx = 92;
const highlightDurationMs = 1800;

const getHashTargetId = () => {
  if (typeof window === "undefined") {
    return "";
  }

  return decodeURIComponent(window.location.hash.replace(/^#/, "")).trim();
};

const scrollToElement = (element: HTMLElement) => {
  const top = Math.max(
    window.scrollY + element.getBoundingClientRect().top - scrollOffsetPx,
    0,
  );

  window.scrollTo({
    top,
    behavior: "smooth",
  });

  element.classList.remove(hashHighlightClass);
  window.requestAnimationFrame(() => {
    element.classList.add(hashHighlightClass);
    window.setTimeout(() => {
      element.classList.remove(hashHighlightClass);
    }, highlightDurationMs);
  });
};

const scrollToCurrentHash = () => {
  const targetId = getHashTargetId();

  if (!targetId) {
    return true;
  }

  const target = document.getElementById(targetId);

  if (!target) {
    return false;
  }

  scrollToElement(target);
  return true;
};

export const useHashScroll = (refreshKey = "") => {
  useEffect(() => {
    let cancelled = false;
    let timeoutId: number | null = null;

    const attemptScroll = (attempt = 0) => {
      if (cancelled) {
        return;
      }

      if (scrollToCurrentHash() || attempt >= maxAttempts) {
        return;
      }

      timeoutId = window.setTimeout(() => {
        attemptScroll(attempt + 1);
      }, retryDelayMs);
    };

    const handleHashChange = () => {
      attemptScroll();
    };

    window.addEventListener("hashchange", handleHashChange);
    timeoutId = window.setTimeout(() => {
      attemptScroll();
    }, 60);

    return () => {
      cancelled = true;
      window.removeEventListener("hashchange", handleHashChange);

      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [refreshKey]);
};
