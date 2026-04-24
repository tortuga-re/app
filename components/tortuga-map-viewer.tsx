"use client";

import {
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  findMasterRoomRegion,
  TORTUGA_MASTER_TABLE_MAP,
} from "@/lib/master-table-map.config";

type TortugaMapViewerProps = {
  roomCode: string;
  roomName: string;
};

type ViewBoxState = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type ClientPoint = {
  x: number;
  y: number;
};

type PointerMap = Map<number, ClientPoint>;

const MAP_WIDTH = TORTUGA_MASTER_TABLE_MAP.width;
const MAP_HEIGHT = TORTUGA_MASTER_TABLE_MAP.height;
const MAP_ASPECT_RATIO = MAP_WIDTH / MAP_HEIGHT;
const MAX_VIEWBOX_WIDTH = MAP_WIDTH;
const MIN_VIEWBOX_WIDTH = MAP_WIDTH * 0.28;
const ZOOM_STEP = 1.18;
const DRAG_THRESHOLD_PX = 8;
const ROOM_FOCUS_PADDING = 84;

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const parsePolygonPoints = (polygon: string) =>
  polygon.split(" ").map((pair) => {
    const [x, y] = pair.split(",").map(Number);
    return { x, y };
  });

const getRegionBounds = (polygon: string) => {
  const points = parsePolygonPoints(polygon);
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2,
  };
};

const clampViewBox = (viewBox: ViewBoxState): ViewBoxState => {
  const width = clamp(viewBox.width, MIN_VIEWBOX_WIDTH, MAX_VIEWBOX_WIDTH);
  const height = width / MAP_ASPECT_RATIO;
  const maxX = MAP_WIDTH - width;
  const maxY = MAP_HEIGHT - height;

  return {
    x: clamp(viewBox.x, 0, Math.max(0, maxX)),
    y: clamp(viewBox.y, 0, Math.max(0, maxY)),
    width,
    height,
  };
};

const getFullViewBox = (): ViewBoxState => ({
  x: 0,
  y: 0,
  width: MAP_WIDTH,
  height: MAP_HEIGHT,
});

const getFocusedRoomViewBox = (roomCode: string): ViewBoxState => {
  const room = findMasterRoomRegion(roomCode);

  if (!room) {
    return getFullViewBox();
  }

  const bounds = getRegionBounds(room.polygon);
  const paddedWidth = bounds.width + ROOM_FOCUS_PADDING * 2;
  const paddedHeight = bounds.height + ROOM_FOCUS_PADDING * 2;
  const nextWidth = clamp(
    Math.max(paddedWidth, paddedHeight * MAP_ASPECT_RATIO),
    MIN_VIEWBOX_WIDTH,
    MAX_VIEWBOX_WIDTH,
  );
  const nextHeight = nextWidth / MAP_ASPECT_RATIO;

  return clampViewBox({
    x: bounds.centerX - nextWidth / 2,
    y: bounds.centerY - nextHeight / 2,
    width: nextWidth,
    height: nextHeight,
  });
};

const getMidpoint = (first: ClientPoint, second: ClientPoint) => ({
  x: (first.x + second.x) / 2,
  y: (first.y + second.y) / 2,
});

const getDistance = (first: ClientPoint, second: ClientPoint) =>
  Math.hypot(second.x - first.x, second.y - first.y);

const getTwoPointerValues = (pointers: PointerMap): [ClientPoint, ClientPoint] | null => {
  const values = Array.from(pointers.values());

  if (values.length < 2) {
    return null;
  }

  return [values[0], values[1]];
};

const getSvgPointFromClient = (
  clientPoint: ClientPoint,
  viewBox: ViewBoxState,
  rect: DOMRect,
) => ({
  x: viewBox.x + ((clientPoint.x - rect.left) / rect.width) * viewBox.width,
  y: viewBox.y + ((clientPoint.y - rect.top) / rect.height) * viewBox.height,
});

const zoomAroundClientPoint = (
  currentViewBox: ViewBoxState,
  clientPoint: ClientPoint,
  zoomFactor: number,
  rect: DOMRect,
) => {
  const anchor = getSvgPointFromClient(clientPoint, currentViewBox, rect);
  const nextWidth = clamp(
    currentViewBox.width / zoomFactor,
    MIN_VIEWBOX_WIDTH,
    MAX_VIEWBOX_WIDTH,
  );
  const nextHeight = nextWidth / MAP_ASPECT_RATIO;
  const ratioX = (clientPoint.x - rect.left) / rect.width;
  const ratioY = (clientPoint.y - rect.top) / rect.height;

  return clampViewBox({
    x: anchor.x - ratioX * nextWidth,
    y: anchor.y - ratioY * nextHeight,
    width: nextWidth,
    height: nextHeight,
  });
};

export function TortugaMapViewer({
  roomCode,
  roomName,
}: TortugaMapViewerProps) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const activePointersRef = useRef<PointerMap>(new Map());
  const dragStateRef = useRef<{
    pointerId: number;
    lastPoint: ClientPoint;
    distance: number;
  } | null>(null);
  const previousRoomCodeRef = useRef(roomCode);
  const pinchStateRef = useRef<{
    initialDistance: number;
    initialViewBox: ViewBoxState;
    anchorSvg: ClientPoint;
    distance: number;
  } | null>(null);
  const suppressClickRef = useRef(false);
  const hasManualInteractionRef = useRef(false);
  const focusedRoomViewBox = useMemo(
    () => getFocusedRoomViewBox(roomCode),
    [roomCode],
  );
  const [viewBox, setViewBox] = useState<ViewBoxState>(focusedRoomViewBox);

  useEffect(() => {
    const roomChanged = previousRoomCodeRef.current !== roomCode;
    previousRoomCodeRef.current = roomCode;

    if (roomChanged) {
      hasManualInteractionRef.current = false;
      setViewBox(focusedRoomViewBox);
      return;
    }

    if (hasManualInteractionRef.current) {
      return;
    }

    setViewBox(focusedRoomViewBox);
  }, [focusedRoomViewBox, roomCode]);

  const markInteraction = () => {
    hasManualInteractionRef.current = true;
  };

  const resetView = () => {
    hasManualInteractionRef.current = false;
    setViewBox(focusedRoomViewBox);
  };

  const zoomFromCenter = (zoomFactor: number) => {
    const rect = viewportRef.current?.getBoundingClientRect();

    if (!rect) {
      return;
    }

    const center = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };

    markInteraction();
    setViewBox((currentViewBox) =>
      zoomAroundClientPoint(currentViewBox, center, zoomFactor, rect),
    );
  };

  const handleWheel = (event: ReactWheelEvent<HTMLDivElement>) => {
    const rect = viewportRef.current?.getBoundingClientRect();

    if (!rect) {
      return;
    }

    event.preventDefault();
    markInteraction();

    const zoomFactor = event.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP;

    setViewBox((currentViewBox) =>
      zoomAroundClientPoint(
        currentViewBox,
        { x: event.clientX, y: event.clientY },
        zoomFactor,
        rect,
      ),
    );
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }

    const point = { x: event.clientX, y: event.clientY };
    activePointersRef.current.set(event.pointerId, point);
    event.currentTarget.setPointerCapture(event.pointerId);

    if (activePointersRef.current.size === 1) {
      dragStateRef.current = {
        pointerId: event.pointerId,
        lastPoint: point,
        distance: 0,
      };
      return;
    }

    const pair = getTwoPointerValues(activePointersRef.current);
    const rect = viewportRef.current?.getBoundingClientRect();

    if (!pair || !rect) {
      return;
    }

    const midpoint = getMidpoint(pair[0], pair[1]);
    pinchStateRef.current = {
      initialDistance: getDistance(pair[0], pair[1]),
      initialViewBox: viewBox,
      anchorSvg: getSvgPointFromClient(midpoint, viewBox, rect),
      distance: 0,
    };
    dragStateRef.current = null;
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!activePointersRef.current.has(event.pointerId)) {
      return;
    }

    const point = { x: event.clientX, y: event.clientY };
    activePointersRef.current.set(event.pointerId, point);
    const rect = viewportRef.current?.getBoundingClientRect();

    if (!rect) {
      return;
    }

    const pair = getTwoPointerValues(activePointersRef.current);

    if (pair && pinchStateRef.current) {
      const midpoint = getMidpoint(pair[0], pair[1]);
      const distance = getDistance(pair[0], pair[1]);
      const pinchState = pinchStateRef.current;
      const zoomRatio = distance / Math.max(pinchState.initialDistance, 1);
      const nextWidth = clamp(
        pinchState.initialViewBox.width / zoomRatio,
        MIN_VIEWBOX_WIDTH,
        MAX_VIEWBOX_WIDTH,
      );
      const nextHeight = nextWidth / MAP_ASPECT_RATIO;
      const ratioX = (midpoint.x - rect.left) / rect.width;
      const ratioY = (midpoint.y - rect.top) / rect.height;

      pinchState.distance = Math.max(
        pinchState.distance,
        Math.abs(distance - pinchState.initialDistance),
      );

      if (pinchState.distance > DRAG_THRESHOLD_PX) {
        suppressClickRef.current = true;
      }

      markInteraction();
      setViewBox(
        clampViewBox({
          x: pinchState.anchorSvg.x - ratioX * nextWidth,
          y: pinchState.anchorSvg.y - ratioY * nextHeight,
          width: nextWidth,
          height: nextHeight,
        }),
      );
      return;
    }

    if (!dragStateRef.current || dragStateRef.current.pointerId !== event.pointerId) {
      return;
    }

    const deltaX = point.x - dragStateRef.current.lastPoint.x;
    const deltaY = point.y - dragStateRef.current.lastPoint.y;
    dragStateRef.current.lastPoint = point;
    dragStateRef.current.distance += Math.abs(deltaX) + Math.abs(deltaY);

    if (dragStateRef.current.distance > DRAG_THRESHOLD_PX) {
      suppressClickRef.current = true;
    }

    if (deltaX === 0 && deltaY === 0) {
      return;
    }

    markInteraction();
    setViewBox((currentViewBox) =>
      clampViewBox({
        ...currentViewBox,
        x: currentViewBox.x - (deltaX / rect.width) * currentViewBox.width,
        y: currentViewBox.y - (deltaY / rect.height) * currentViewBox.height,
      }),
    );
  };

  const handlePointerRelease = (event: ReactPointerEvent<HTMLDivElement>) => {
    activePointersRef.current.delete(event.pointerId);

    if (activePointersRef.current.size < 2) {
      pinchStateRef.current = null;
    }

    if (
      dragStateRef.current &&
      dragStateRef.current.pointerId === event.pointerId
    ) {
      dragStateRef.current = null;
    }

    if (activePointersRef.current.size === 1) {
      const remainingPointer = Array.from(activePointersRef.current.entries())[0];

      if (remainingPointer) {
        dragStateRef.current = {
          pointerId: remainingPointer[0],
          lastPoint: remainingPointer[1],
          distance: 0,
        };
      }
    }
  };

  return (
    <div className="panel rounded-[2rem] p-5">
      <div className="space-y-2">
        <p className="eyebrow">Mappa del Tortuga</p>
        <p className="text-sm leading-6 text-[var(--text-muted)]">
          Usa la piantina per orientarti meglio nel locale. La sala resta quella che
          hai scelto dal menu e la mappa serve solo come riferimento visivo.
        </p>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-[rgba(255,216,156,0.14)] bg-[rgba(255,255,255,0.04)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">
          Sala scelta
        </span>
        <span className="rounded-full border border-[rgba(255,216,156,0.12)] bg-[rgba(255,255,255,0.03)] px-3 py-1 text-sm font-medium text-white">
          {roomName}
        </span>
      </div>

      <div className="relative mt-4 overflow-hidden rounded-[1.75rem] border border-[rgba(255,216,156,0.14)] bg-[linear-gradient(180deg,rgba(33,23,16,0.98),rgba(15,10,8,1))] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
        <div className="pointer-events-none absolute right-5 top-5 z-10 flex flex-col gap-2">
          <button
            type="button"
            className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full border border-[rgba(255,216,156,0.16)] bg-[rgba(15,12,10,0.8)] text-lg font-semibold text-[var(--accent-strong)] shadow-[0_8px_24px_rgba(0,0,0,0.24)] backdrop-blur"
            onClick={() => zoomFromCenter(ZOOM_STEP)}
            aria-label="Ingrandisci mappa"
          >
            +
          </button>
          <button
            type="button"
            className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full border border-[rgba(255,216,156,0.16)] bg-[rgba(15,12,10,0.8)] text-lg font-semibold text-[var(--accent-strong)] shadow-[0_8px_24px_rgba(0,0,0,0.24)] backdrop-blur"
            onClick={() => zoomFromCenter(1 / ZOOM_STEP)}
            aria-label="Riduci mappa"
          >
            -
          </button>
        </div>

        <div
          ref={viewportRef}
          className="touch-none select-none overflow-hidden rounded-[1.45rem] border border-[rgba(255,216,156,0.1)] bg-[rgba(10,8,6,0.55)] p-2"
          onWheel={handleWheel}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerRelease}
          onPointerCancel={handlePointerRelease}
          onPointerLeave={handlePointerRelease}
          onClickCapture={(event) => {
            if (!suppressClickRef.current) {
              return;
            }

            suppressClickRef.current = false;
            event.preventDefault();
            event.stopPropagation();
          }}
        >
          <svg
            viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
            className="block h-auto w-full overflow-hidden rounded-[1.15rem]"
            role="img"
            aria-label={`Piantina del Tortuga con focus su ${roomName}`}
          >
            <image
              href={TORTUGA_MASTER_TABLE_MAP.imagePath}
              x="0"
              y="0"
              width={TORTUGA_MASTER_TABLE_MAP.width}
              height={TORTUGA_MASTER_TABLE_MAP.height}
              preserveAspectRatio="xMidYMid meet"
            />
          </svg>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 px-1">
        <p className="text-xs leading-5 text-[var(--text-muted)]">
          Trascina per esplorare la mappa, pizzica per zoomare oppure usa i
          controlli + e -.
        </p>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded-full border border-[rgba(255,216,156,0.12)] bg-[rgba(255,255,255,0.03)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]"
            onClick={resetView}
          >
            Reset vista
          </button>
          <span className="rounded-full border border-[rgba(255,216,156,0.08)] bg-[rgba(255,255,255,0.02)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
            Zoom {Math.round((MAP_WIDTH / viewBox.width) * 100)}%
          </span>
        </div>
      </div>
    </div>
  );
}
