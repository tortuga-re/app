"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  findMasterRoomRegion,
  getMasterTableVisuals,
  TORTUGA_MASTER_TABLE_MAP,
} from "@/lib/master-table-map.config";
import { cn } from "@/lib/utils";

type TortugaMasterTableMapProps = {
  roomCode: string;
  compatibleTableIds: string[];
  selectedTableId: string;
  selectedComboMemberIds: string[];
  onSelectTable: (tableId: string) => void;
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

const AVAILABLE_FILL = "#f7f4ec";
const AVAILABLE_STROKE = "rgba(53, 40, 25, 0.52)";
const DISABLED_FILL = "rgba(207, 164, 88, 0.82)";
const DISABLED_STROKE = "rgba(110, 72, 32, 0.64)";
const DIMMED_FILL = "rgba(252, 247, 235, 0.48)";
const DIMMED_STROKE = "rgba(60, 44, 27, 0.22)";
const SELECTED_FILL = "#fff3d9";
const SELECTED_STROKE = "#9e6932";

const roomRegions = TORTUGA_MASTER_TABLE_MAP.roomRegions;
const masterTables = getMasterTableVisuals();
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

const getChairRects = (width: number, height: number) => {
  const chairWidth = Math.max(10, Math.round(width * 0.16));
  const chairHeight = Math.max(10, Math.round(height * 0.14));
  const isHorizontal = width >= height;

  if (isHorizontal) {
    return [
      {
        x: -width * 0.25 - chairWidth / 2,
        y: -height / 2 - chairHeight * 0.78,
        width: chairWidth,
        height: chairHeight,
      },
      {
        x: width * 0.25 - chairWidth / 2,
        y: -height / 2 - chairHeight * 0.78,
        width: chairWidth,
        height: chairHeight,
      },
      {
        x: -width * 0.25 - chairWidth / 2,
        y: height / 2 - chairHeight * 0.2,
        width: chairWidth,
        height: chairHeight,
      },
      {
        x: width * 0.25 - chairWidth / 2,
        y: height / 2 - chairHeight * 0.2,
        width: chairWidth,
        height: chairHeight,
      },
    ];
  }

  return [
    {
      x: -width / 2 - chairWidth * 0.78,
      y: -height * 0.24 - chairHeight / 2,
      width: chairWidth,
      height: chairHeight,
    },
    {
      x: -width / 2 - chairWidth * 0.78,
      y: height * 0.24 - chairHeight / 2,
      width: chairWidth,
      height: chairHeight,
    },
    {
      x: width / 2 - chairWidth * 0.2,
      y: -height * 0.24 - chairHeight / 2,
      width: chairWidth,
      height: chairHeight,
    },
    {
      x: width / 2 - chairWidth * 0.2,
      y: height * 0.24 - chairHeight / 2,
      width: chairWidth,
      height: chairHeight,
    },
  ];
};

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

export function TortugaMasterTableMap({
  roomCode,
  compatibleTableIds,
  selectedTableId,
  selectedComboMemberIds,
  onSelectTable,
}: TortugaMasterTableMapProps) {
  const activeRoom = findMasterRoomRegion(roomCode);
  const compatibleSet = new Set(compatibleTableIds);
  const comboSet = new Set(selectedComboMemberIds);
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
      setViewBox(focusedRoomViewBox);
      return;
    }

    if (hasManualInteractionRef.current) {
      return;
    }

    setViewBox(focusedRoomViewBox);
  }, [focusedRoomViewBox, roomCode]);

  const handleKeyDown = (
    event: React.KeyboardEvent<SVGGElement>,
    tableId: string,
    isInteractive: boolean,
  ) => {
    if (!isInteractive) {
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelectTable(tableId);
    }
  };

  const markInteraction = () => {
    hasManualInteractionRef.current = true;
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

  const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
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

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
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

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
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

  const handlePointerRelease = (event: React.PointerEvent<HTMLDivElement>) => {
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
    <div className="relative overflow-hidden rounded-[1.75rem] border border-[rgba(255,216,156,0.14)] bg-[linear-gradient(180deg,rgba(33,23,16,0.98),rgba(15,10,8,1))] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
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
          aria-label="Mappa interattiva del Tortuga"
        >
          <image
            href={TORTUGA_MASTER_TABLE_MAP.imagePath}
            x="0"
            y="0"
            width={TORTUGA_MASTER_TABLE_MAP.width}
            height={TORTUGA_MASTER_TABLE_MAP.height}
            preserveAspectRatio="xMidYMid meet"
          />

          <rect
            width={TORTUGA_MASTER_TABLE_MAP.width}
            height={TORTUGA_MASTER_TABLE_MAP.height}
            fill="rgba(12, 9, 7, 0.14)"
          />

          {roomRegions.map((region) => {
            const isActive = region.roomCode === roomCode;
            const isSecondary = roomCode !== region.roomCode;

            return (
              <g key={region.roomCode}>
                <polygon
                  points={region.polygon}
                  fill={isActive ? "rgba(242, 215, 165, 0.12)" : "rgba(11, 8, 6, 0.18)"}
                  stroke={isActive ? "rgba(242, 215, 165, 0.52)" : "rgba(255, 255, 255, 0.05)"}
                  strokeWidth={isActive ? 6 : 2}
                  strokeLinejoin="round"
                  opacity={isSecondary ? 0.78 : 1}
                />

                {isActive ? (
                  <g transform={`translate(${region.badgeX} ${region.badgeY})`}>
                    <rect
                      x="-96"
                      y="-24"
                      width="192"
                      height="48"
                      rx="24"
                      fill="rgba(19, 13, 9, 0.72)"
                      stroke="rgba(242, 215, 165, 0.38)"
                      strokeWidth="2"
                    />
                    <text
                      x="0"
                      y="-4"
                      textAnchor="middle"
                      fontSize="13"
                      fontWeight="700"
                      letterSpacing="3"
                      fill="rgba(242, 215, 165, 0.92)"
                    >
                      SALA ATTIVA
                    </text>
                    <text
                      x="0"
                      y="14"
                      textAnchor="middle"
                      fontSize="17"
                      fontWeight="700"
                      fill="#fff8ea"
                    >
                      {activeRoom?.publicName ?? region.publicName}
                    </text>
                  </g>
                ) : null}
              </g>
            );
          })}

          {masterTables.map((table) => {
            const isInActiveRoom = table.roomCode === roomCode;
            const isCompatible = compatibleSet.has(table.tableId);
            const isSelected = selectedTableId === table.tableId;
            const isComboMember = comboSet.has(table.tableId);
            const isSelectedInCurrentChoice = isSelected || isComboMember;
            const isInteractive = isCompatible;
            const chairRects = getChairRects(table.width, table.height);

            let fill = AVAILABLE_FILL;
            let stroke = AVAILABLE_STROKE;
            let labelFill = "#22160f";
            let tableOpacity = 1;
            let haloStroke = "transparent";
            let haloWidth = 0;

            if (!isCompatible) {
              fill = isInActiveRoom ? DISABLED_FILL : DIMMED_FILL;
              stroke = isInActiveRoom ? DISABLED_STROKE : DIMMED_STROKE;
              labelFill = isInActiveRoom ? "#22160f" : "rgba(33, 22, 15, 0.48)";
              tableOpacity = isInActiveRoom ? 0.92 : 0.58;
            } else if (!isInActiveRoom) {
              fill = AVAILABLE_FILL;
              stroke = AVAILABLE_STROKE;
              labelFill = "#22160f";
              tableOpacity = 0.92;
            }

            if (isSelectedInCurrentChoice) {
              fill = SELECTED_FILL;
              stroke = SELECTED_STROKE;
              haloStroke = "rgba(255, 233, 184, 0.52)";
              haloWidth = 8;
            }

            return (
              <g
                key={table.tableId}
                transform={`translate(${table.x} ${table.y}) rotate(${table.rotation ?? 0})`}
                role={isInteractive ? "button" : undefined}
                tabIndex={isInteractive ? 0 : -1}
                aria-label={`Tavolo ${table.tableId}`}
                onClick={() => {
                  if (isInteractive) {
                    onSelectTable(table.tableId);
                  }
                }}
                onKeyDown={(event) =>
                  handleKeyDown(event, table.tableId, isInteractive)
                }
                style={{ cursor: isInteractive ? "pointer" : "default" }}
              >
                {haloWidth > 0 ? (
                  <rect
                    x={-table.width / 2 - 6}
                    y={-table.height / 2 - 6}
                    width={table.width + 12}
                    height={table.height + 12}
                    rx={Math.min(table.width, table.height) * 0.2}
                    fill="none"
                    stroke={haloStroke}
                    strokeWidth={haloWidth}
                  />
                ) : null}

                {chairRects.map((chair, index) => (
                  <rect
                    key={`${table.tableId}-chair-${index}`}
                    x={chair.x}
                    y={chair.y}
                    width={chair.width}
                    height={chair.height}
                    rx={Math.min(chair.width, chair.height) * 0.26}
                    fill={fill}
                    stroke={stroke}
                    strokeWidth="2"
                    opacity={tableOpacity}
                  />
                ))}

                <rect
                  x={-table.width / 2}
                  y={-table.height / 2}
                  width={table.width}
                  height={table.height}
                  rx={Math.min(table.width, table.height) * 0.16}
                  fill={fill}
                  stroke={stroke}
                  strokeWidth="3"
                  opacity={tableOpacity}
                />

                <text
                  x="0"
                  y="7"
                  textAnchor="middle"
                  fontSize={Math.max(20, Math.min(table.width, table.height) * 0.44)}
                  fontWeight="700"
                  fill={labelFill}
                  opacity={tableOpacity}
                >
                  {table.tableId}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 px-1">
        <p className="text-xs leading-5 text-[var(--text-muted)]">
          Trascina per esplorare la mappa, pizzica per zoomare oppure usa i
          controlli + e -.
        </p>
        <p
          className={cn(
            "rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]",
            viewBox.width < MAP_WIDTH
              ? "border-[rgba(255,216,156,0.18)] bg-[rgba(255,255,255,0.04)] text-[var(--accent-strong)]"
              : "border-[rgba(255,216,156,0.08)] bg-[rgba(255,255,255,0.02)] text-[var(--text-muted)]",
          )}
        >
          Zoom {Math.round((MAP_WIDTH / viewBox.width) * 100)}%
        </p>
      </div>
    </div>
  );
}
