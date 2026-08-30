"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export function DragCarousel({ children, className, label, resetKey }: { children: React.ReactNode; className?: string; label: string; resetKey?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef({ active: false, moved: false, captured: false, startX: 0, startScroll: 0 });

  useEffect(() => {
    ref.current?.scrollTo({ left: 0, behavior: "auto" });
  }, [resetKey]);

  return <div
    ref={ref}
    className={cn("drag-carousel", className)}
    aria-label={label}
    onPointerDown={(event) => {
      if (event.pointerType !== "mouse" || event.button !== 0) return;
      // Links and buttons are valid drag handles: a real drag is suppressed in
      // onClickCapture, while a stationary pointer still activates the card.
      if ((event.target as HTMLElement).closest("input, select, textarea")) return;
      const element = ref.current;
      if (!element) return;
      drag.current = { active: true, moved: false, captured: false, startX: event.clientX, startScroll: element.scrollLeft };
    }}
    onPointerMove={(event) => {
      const element = ref.current;
      if (!element || !drag.current.active) return;
      const distance = event.clientX - drag.current.startX;
      if (Math.abs(distance) <= 7 && !drag.current.moved) return;
      if (!drag.current.captured) {
        element.setPointerCapture(event.pointerId);
        drag.current.captured = true;
      }
      drag.current.moved = true;
      element.scrollLeft = drag.current.startScroll - distance;
    }}
    onPointerUp={(event) => {
      drag.current.active = false;
      if (drag.current.captured && ref.current?.hasPointerCapture(event.pointerId)) {
        ref.current.releasePointerCapture(event.pointerId);
      }
      drag.current.captured = false;
    }}
    onPointerCancel={() => { drag.current.active = false; drag.current.captured = false; }}
    onClickCapture={(event) => {
      if (drag.current.moved) { event.preventDefault(); event.stopPropagation(); drag.current.moved = false; }
    }}
    onWheel={(event) => {
      const element = ref.current;
      if (!element || element.scrollWidth <= element.clientWidth) return;
      if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) {
        event.preventDefault();
        element.scrollBy({ left: event.deltaY, behavior: "smooth" });
      }
    }}
  >{children}</div>;
}
