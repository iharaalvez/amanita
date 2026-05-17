"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useMemo } from "react";
import {
  ImageOverlay,
  MapContainer,
  Polygon,
  Tooltip,
  useMap,
} from "react-leaflet";
import type { GameLocationGroup, MapLocationOutline } from "@/types/pokemon";

type Props = {
  gameId: string;
  outlines: MapLocationOutline[];
  locations: GameLocationGroup[];
  registeredIds: readonly number[];
  selectedRegion: string | null;
  onZoneClick: (location: GameLocationGroup) => void;
};

type RasterMapConfig = {
  gameId: string;
  regionAreaIdentifier: string;
  directory: string;
  filePrefix: string;
  rows: number;
  columns: number;
  coordinateSize: number;
  normalizeOutlines?: boolean;
  outlineTarget?: "full" | "core";
  outlineScaleX?: number;
  outlineScaleY?: number;
  outlineOffsetX?: number;
  outlineOffsetY?: number;
  tileOrder?:
    | "row-column"
    | "column-row-zero"
    | "column-bottom-up"
    | "column-bottom-up-zero";
  sourceRowByRenderedRow?: Record<number, number>;
  edgeRows?: number;
  edgeColumns?: number;
  edgeTileOrder?: "column-bottom-up-one";
  coreRowOffset?: number;
  coreColumnOffset?: number;
  viewPadding?: number;
};

type CoordinateBounds = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
};

type TargetBounds = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
};

const TILE_OVERLAP = 2;

const RASTER_MAPS: RasterMapConfig[] = [
  {
    gameId: "scarlet-violet",
    regionAreaIdentifier: "paldea",
    directory: "/maps/scarlet-violet/paldea-m",
    filePrefix: "ymap_ter",
    rows: 10,
    columns: 10,
    coordinateSize: 15616,
    normalizeOutlines: true,
    outlineTarget: "core",
    outlineScaleX: 1,
    outlineScaleY: 1,
    outlineOffsetX: 0,
    outlineOffsetY: 0,
    tileOrder: "column-bottom-up",
    edgeRows: 12,
    edgeColumns: 12,
    edgeTileOrder: "column-bottom-up-one",
    coreRowOffset: 1,
    coreColumnOffset: 1,
    viewPadding: 1800,
  },
  {
    gameId: "scarlet-violet",
    regionAreaIdentifier: "kitakami",
    directory: "/maps/scarlet-violet/kitakami-m",
    filePrefix: "ymap_ter_dlc1",
    rows: 4,
    columns: 4,
    coordinateSize: 6600,
    normalizeOutlines: true,
    outlineTarget: "core",
    outlineScaleX: 0.77,
    outlineScaleY: 0.75,
    outlineOffsetX: 50,
    outlineOffsetY: -50,
    tileOrder: "column-bottom-up-zero",
    edgeRows: 6,
    edgeColumns: 6,
    edgeTileOrder: "column-bottom-up-one",
    coreRowOffset: 1,
    coreColumnOffset: 1,
    viewPadding: 800,
  },
  {
    gameId: "scarlet-violet",
    regionAreaIdentifier: "blueberry-academy",
    directory: "/maps/scarlet-violet/blueberry-academy-m",
    filePrefix: "ymap_ter_dlc2",
    rows: 4,
    columns: 4,
    coordinateSize: 6600,
    normalizeOutlines: true,
    outlineTarget: "core",
    outlineScaleX: 0.87,
    outlineScaleY: 0.87,
    outlineOffsetX: -8,
    outlineOffsetY: -8,
    tileOrder: "column-bottom-up-zero",
    edgeRows: 6,
    edgeColumns: 6,
    edgeTileOrder: "column-bottom-up-one",
    coreRowOffset: 1,
    coreColumnOffset: 1,
    viewPadding: 800,
  },
];

function getRasterMapConfig(
  gameId: string,
  regionAreaIdentifier: string | null,
) {
  return RASTER_MAPS.find(
    (config) =>
      config.gameId === gameId &&
      config.regionAreaIdentifier === regionAreaIdentifier,
  );
}

function tileFileName(config: RasterMapConfig, row: number, column: number) {
  if (config.tileOrder === "column-bottom-up") {
    const sourceColumn = column;
    const sourceRow = config.sourceRowByRenderedRow?.[row] ?? config.rows - row;
    return `${config.filePrefix}_${String(sourceColumn).padStart(
      2,
      "0",
    )}_${String(sourceRow).padStart(2, "0")}.png`;
  }

  if (config.tileOrder === "column-bottom-up-zero") {
    const sourceColumn = column;
    const sourceRow =
      config.sourceRowByRenderedRow?.[row] ?? config.rows - row - 1;
    return `${config.filePrefix}_${String(sourceColumn).padStart(
      2,
      "0",
    )}_${String(sourceRow).padStart(2, "0")}.png`;
  }

  if (config.tileOrder === "column-row-zero") {
    const sourceRow = config.sourceRowByRenderedRow?.[row] ?? row;
    return `${config.filePrefix}_${String(column).padStart(2, "0")}_${String(
      sourceRow,
    ).padStart(2, "0")}.png`;
  }

  const sourceRow = config.sourceRowByRenderedRow?.[row] ?? row;
  return `${config.filePrefix}_${String(sourceRow).padStart(2, "0")}_${String(
    column,
  ).padStart(2, "0")}.png`;
}

function edgeTileFileName(
  config: RasterMapConfig,
  row: number,
  column: number,
) {
  if (config.edgeTileOrder === "column-bottom-up-one") {
    const sourceColumn = column + 1;
    const sourceRow = (config.edgeRows ?? 0) - row;
    return `${config.filePrefix}_${String(sourceColumn).padStart(
      3,
      "0",
    )}_${String(sourceRow).padStart(3, "0")}.png`;
  }

  return `${config.filePrefix}_${String(row + 1).padStart(3, "0")}_${String(
    column + 1,
  ).padStart(3, "0")}.png`;
}

function tileBounds(
  config: RasterMapConfig,
  row: number,
  column: number,
  gridRows = config.rows,
  gridColumns = config.columns,
  rowOffset = 0,
  columnOffset = 0,
  overlap = 0,
): L.LatLngBoundsExpression {
  const rowSpan = config.coordinateSize / gridRows;
  const columnSpan = config.coordinateSize / gridColumns;
  const mapRow = row + rowOffset;
  const mapColumn = column + columnOffset;
  const top = config.coordinateSize - mapRow * rowSpan + overlap;
  const bottom = config.coordinateSize - (mapRow + 1) * rowSpan - overlap;
  return [
    [bottom, mapColumn * columnSpan - overlap],
    [top, (mapColumn + 1) * columnSpan + overlap],
  ];
}

function isEdgeTile(
  row: number,
  column: number,
  rows: number,
  columns: number,
) {
  return (
    row === 0 || column === 0 || row === rows - 1 || column === columns - 1
  );
}

function coreTargetBounds(config: RasterMapConfig): TargetBounds {
  const gridRows = config.edgeRows ?? config.rows;
  const gridColumns = config.edgeColumns ?? config.columns;
  const rowSpan = config.coordinateSize / gridRows;
  const columnSpan = config.coordinateSize / gridColumns;
  const rowOffset = config.coreRowOffset ?? 0;
  const columnOffset = config.coreColumnOffset ?? 0;

  return {
    minX: columnOffset * columnSpan,
    maxX: (columnOffset + config.columns) * columnSpan,
    minY: rowOffset * rowSpan,
    maxY: (rowOffset + config.rows) * rowSpan,
  };
}

function outlineTargetBounds(config: RasterMapConfig): TargetBounds {
  if (config.outlineTarget === "core") return coreTargetBounds(config);

  return {
    minX: 0,
    maxX: config.coordinateSize,
    minY: 0,
    maxY: config.coordinateSize,
  };
}

function viewBounds(config: RasterMapConfig): L.LatLngBoundsExpression {
  const padding = config.viewPadding ?? 0;
  return [
    [-padding, -padding],
    [config.coordinateSize + padding, config.coordinateSize + padding],
  ];
}

function toMapPoint(
  [x, y]: [number, number],
  rasterMapConfig: RasterMapConfig | undefined,
  coordinateBounds: CoordinateBounds | null,
  outlineOffsetY: number,
): [number, number] {
  if (!rasterMapConfig) return [-y, x];

  const yAbs = -y;
  if (!coordinateBounds) return [rasterMapConfig.coordinateSize - yAbs, x];

  const width = coordinateBounds.maxX - coordinateBounds.minX;
  const height = coordinateBounds.maxY - coordinateBounds.minY;
  if (width <= 0 || height <= 0) {
    return [rasterMapConfig.coordinateSize - yAbs, x];
  }

  const targetBounds = outlineTargetBounds(rasterMapConfig);
  const targetWidth = targetBounds.maxX - targetBounds.minX;
  const targetHeight = targetBounds.maxY - targetBounds.minY;
  const normalizedX =
    targetBounds.minX + ((x - coordinateBounds.minX) / width) * targetWidth;
  const normalizedY =
    targetBounds.minY +
    ((yAbs - coordinateBounds.minY) / height) * targetHeight;
  const centerX = (targetBounds.minX + targetBounds.maxX) / 2;
  const centerY = (targetBounds.minY + targetBounds.maxY) / 2;
  const scaledX =
    centerX +
    (normalizedX - centerX) * (rasterMapConfig.outlineScaleX ?? 1) +
    (rasterMapConfig.outlineOffsetX ?? 0);
  const scaledY =
    centerY + (normalizedY - centerY) * (rasterMapConfig.outlineScaleY ?? 1);

  return [rasterMapConfig.coordinateSize - scaledY + outlineOffsetY, scaledX];
}

function computeBounds(
  points: [number, number][],
): L.LatLngBoundsExpression | null {
  if (points.length === 0) return null;
  const lats = points.map(([lat]) => lat);
  const lngs = points.map(([, lng]) => lng);
  return [
    [Math.min(...lats), Math.min(...lngs)],
    [Math.max(...lats), Math.max(...lngs)],
  ];
}

function BoundsController({
  bounds,
  fullExtent,
}: {
  bounds: L.LatLngBoundsExpression;
  fullExtent?: L.LatLngBoundsExpression;
}) {
  const map = useMap();
  useEffect(() => {
    map.fitBounds(bounds, { padding: [24, 24] });

    const updateMinZoom = () => {
      const ext = fullExtent ?? bounds;
      const size = map.getSize();
      if (size.x <= 0 || size.y <= 0) return;
      const lb = L.latLngBounds(ext as L.LatLngBoundsLiteral);
      const lngSpan = lb.getEast() - lb.getWest();
      const latSpan = lb.getNorth() - lb.getSouth();
      const scale = Math.min(size.x / lngSpan, size.y / latSpan);
      map.setMinZoom(Math.log2(scale));
    };

    if (fullExtent) {
      map.setMaxBounds(fullExtent as L.LatLngBoundsExpression);
    }

    updateMinZoom();
    map.on("resize", updateMinZoom);
    return () => {
      map.off("resize", updateMinZoom);
    };
  }, [map, bounds, fullExtent]);
  return null;
}

function computeCoordinateBounds(
  outlines: MapLocationOutline[],
): CoordinateBounds | null {
  const points = outlines.flatMap((outline) => outline.points);
  if (points.length === 0) return null;

  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => -y);

  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
  };
}

function getOutlineOffsetY(rasterMapConfig: RasterMapConfig | undefined) {
  if (!rasterMapConfig?.normalizeOutlines) return 0;
  return rasterMapConfig.outlineOffsetY ?? 0;
}

export default function GameMapLeaflet({
  gameId,
  outlines,
  locations,
  registeredIds,
  selectedRegion,
  onZoneClick,
}: Props) {
  const registeredSet = useMemo(() => new Set(registeredIds), [registeredIds]);

  const locationByName = useMemo(() => {
    const map = new Map<string, GameLocationGroup>();
    for (const loc of locations) map.set(loc.location, loc);
    return map;
  }, [locations]);

  const visibleOutlines = useMemo(
    () =>
      selectedRegion
        ? outlines.filter((o) => o.regionAreaIdentifier === selectedRegion)
        : outlines,
    [outlines, selectedRegion],
  );

  const rasterMapConfig = getRasterMapConfig(gameId, selectedRegion);
  const edgeRows = rasterMapConfig?.edgeRows ?? 0;
  const edgeColumns = rasterMapConfig?.edgeColumns ?? 0;
  const mapViewBounds = rasterMapConfig
    ? viewBounds(rasterMapConfig)
    : undefined;
  const coordinateBounds = rasterMapConfig?.normalizeOutlines
    ? computeCoordinateBounds(visibleOutlines)
    : null;
  const renderableOutlines = visibleOutlines;

  const allPoints = renderableOutlines.flatMap((o) =>
    o.points.map((point) => {
      const outlineOffsetY = getOutlineOffsetY(rasterMapConfig);
      return toMapPoint(
        point,
        rasterMapConfig,
        coordinateBounds,
        outlineOffsetY,
      );
    }),
  );

  const bounds = computeBounds(allPoints);

  const outlinesByLocation = useMemo(() => {
    const map = new Map<string, MapLocationOutline[]>();
    for (const outline of renderableOutlines) {
      const existing = map.get(outline.locationIdentifier) ?? [];
      existing.push(outline);
      map.set(outline.locationIdentifier, existing);
    }
    return map;
  }, [renderableOutlines]);

  if (!bounds) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-gray-400">
        No outline data for this region.
      </div>
    );
  }

  return (
    <MapContainer
      crs={L.CRS.Simple}
      bounds={bounds}
      style={{ height: "100%", width: "100%", background: "#0f172a" }}
      maxZoom={5}
      zoomSnap={0.25}
      attributionControl={false}
      zoomControl={true}
      maxBoundsViscosity={1.0}
    >
      <BoundsController bounds={bounds} fullExtent={mapViewBounds} />
      {rasterMapConfig &&
        edgeRows > 0 &&
        edgeColumns > 0 &&
        Array.from({ length: edgeRows }).flatMap((_, row) =>
          Array.from({ length: edgeColumns })
            .map((__, column) => ({ row, column }))
            .filter(({ row, column }) =>
              isEdgeTile(row, column, edgeRows, edgeColumns),
            )
            .map(({ row, column }) => (
              <ImageOverlay
                key={`${rasterMapConfig.regionAreaIdentifier}-edge-${row}-${column}`}
                url={`${rasterMapConfig.directory}/${edgeTileFileName(
                  rasterMapConfig,
                  row,
                  column,
                )}`}
                bounds={tileBounds(
                  rasterMapConfig,
                  row,
                  column,
                  edgeRows,
                  edgeColumns,
                  0,
                  0,
                  TILE_OVERLAP,
                )}
                opacity={1}
                zIndex={1}
                interactive={false}
              />
            )),
        )}
      {rasterMapConfig &&
        Array.from({ length: rasterMapConfig.rows }).flatMap((_, row) =>
          Array.from({ length: rasterMapConfig.columns }).map((__, column) => (
            <ImageOverlay
              key={`${rasterMapConfig.regionAreaIdentifier}-${row}-${column}`}
              url={`${rasterMapConfig.directory}/${tileFileName(
                rasterMapConfig,
                row,
                column,
              )}`}
              bounds={tileBounds(
                rasterMapConfig,
                row,
                column,
                rasterMapConfig.edgeRows ?? rasterMapConfig.rows,
                rasterMapConfig.edgeColumns ?? rasterMapConfig.columns,
                rasterMapConfig.coreRowOffset,
                rasterMapConfig.coreColumnOffset,
                TILE_OVERLAP,
              )}
              opacity={1}
              zIndex={2}
              interactive={false}
            />
          )),
        )}
      {Array.from(outlinesByLocation.entries()).map(
        ([locationId, locationOutlines]) => {
          const firstOutline = locationOutlines[0];
          const locationGroup = locationByName.get(firstOutline.locationName);
          const pokemonList = locationGroup?.pokemon ?? [];
          const total = pokemonList.length;
          const missing = pokemonList.filter(
            (p) => !registeredSet.has(p.speciesId),
          ).length;
          const registered = total - missing;

          const color =
            total === 0 ? "#475569" : missing > 0 ? "#f59e0b" : "#22c55e";
          const fillOpacity = missing > 0 ? 0.35 : total > 0 ? 0.2 : 0.15;

          return locationOutlines.map((outline, idx) => {
            const outlineOffsetY = getOutlineOffsetY(rasterMapConfig);

            return (
              <Polygon
                key={`${locationId}-${idx}`}
                positions={
                  outline.points.map((point) =>
                    toMapPoint(
                      point,
                      rasterMapConfig,
                      coordinateBounds,
                      outlineOffsetY,
                    ),
                  ) as L.LatLngExpression[]
                }
                pathOptions={{
                  color,
                  weight: 1.5,
                  fillColor: color,
                  fillOpacity,
                }}
                eventHandlers={{
                  mouseover: (e) => {
                    (e.target as L.Polygon).setStyle({
                      fillOpacity: 0.6,
                      weight: 2.5,
                    });
                  },
                  mouseout: (e) => {
                    (e.target as L.Polygon).setStyle({
                      fillOpacity,
                      weight: 1.5,
                    });
                  },
                  click: () => {
                    if (locationGroup) onZoneClick(locationGroup);
                  },
                }}
              >
                <Tooltip sticky direction="top" offset={[0, -4]}>
                  <div style={{ lineHeight: 1.4 }}>
                    <strong style={{ fontSize: 12 }}>
                      {firstOutline.locationName}
                    </strong>
                    {total > 0 && (
                      <div
                        style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}
                      >
                        {registered}/{total} registered
                      </div>
                    )}
                  </div>
                </Tooltip>
              </Polygon>
            );
          });
        },
      )}
    </MapContainer>
  );
}
