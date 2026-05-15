"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useMemo } from "react";
import {
  ImageOverlay,
  MapContainer,
  Polygon,
  Popup,
  Tooltip,
  useMap,
} from "react-leaflet";
import { PokemonSprite } from "@/components/pokemon/PokemonSprite";
import type { GameLocationGroup, MapLocationOutline } from "@/types/pokemon";

type Props = {
  gameId: string;
  outlines: MapLocationOutline[];
  locations: GameLocationGroup[];
  registeredIds: readonly number[];
  selectedRegion: string | null;
  onSelect: (
    speciesId: number,
    formName: string | null,
    gameId: string,
  ) => void;
};

type RasterMapConfig = {
  gameId: string;
  regionAreaIdentifier: string;
  directory: string;
  filePrefix: string;
  rows: number;
  columns: number;
  coordinateSize: number;
};

const RASTER_MAPS: RasterMapConfig[] = [
  {
    gameId: "scarlet-violet",
    regionAreaIdentifier: "paldea",
    directory: "/maps/scarlet-violet/paldea-m",
    filePrefix: "ymap_ter",
    rows: 10,
    columns: 10,
    coordinateSize: 14400,
  },
  {
    gameId: "scarlet-violet",
    regionAreaIdentifier: "kitakami",
    directory: "/maps/scarlet-violet/kitakami-m",
    filePrefix: "ymap_ter_dlc1",
    rows: 4,
    columns: 4,
    coordinateSize: 6600,
  },
  {
    gameId: "scarlet-violet",
    regionAreaIdentifier: "blueberry-academy",
    directory: "/maps/scarlet-violet/blueberry-academy-m",
    filePrefix: "ymap_ter_dlc2",
    rows: 4,
    columns: 4,
    coordinateSize: 6600,
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
  return `${config.filePrefix}_${String(row).padStart(2, "0")}_${String(
    column,
  ).padStart(2, "0")}.png`;
}

function tileBounds(
  config: RasterMapConfig,
  row: number,
  column: number,
): L.LatLngBoundsExpression {
  const rowSpan = config.coordinateSize / config.rows;
  const columnSpan = config.coordinateSize / config.columns;
  const top = config.coordinateSize - row * rowSpan;
  const bottom = config.coordinateSize - (row + 1) * rowSpan;
  return [
    [bottom, column * columnSpan],
    [top, (column + 1) * columnSpan],
  ];
}

function toMapPoint(
  [x, y]: [number, number],
  rasterMapConfig: RasterMapConfig | undefined,
): [number, number] {
  return rasterMapConfig ? [rasterMapConfig.coordinateSize + y, x] : [-y, x];
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

function BoundsController({ bounds }: { bounds: L.LatLngBoundsExpression }) {
  const map = useMap();
  useEffect(() => {
    map.fitBounds(bounds, { padding: [24, 24] });
  }, [map, bounds]);
  return null;
}

export default function GameMapLeaflet({
  gameId,
  outlines,
  locations,
  registeredIds,
  selectedRegion,
  onSelect,
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
  const allPoints = useMemo(
    () =>
      visibleOutlines.flatMap((o) =>
        o.points.map((point) => toMapPoint(point, rasterMapConfig)),
      ),
    [rasterMapConfig, visibleOutlines],
  );

  const bounds = useMemo(() => computeBounds(allPoints), [allPoints]);

  const outlinesByLocation = useMemo(() => {
    const map = new Map<string, MapLocationOutline[]>();
    for (const outline of visibleOutlines) {
      const existing = map.get(outline.locationIdentifier) ?? [];
      existing.push(outline);
      map.set(outline.locationIdentifier, existing);
    }
    return map;
  }, [visibleOutlines]);

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
      minZoom={-5}
      zoomSnap={0.25}
      attributionControl={false}
      zoomControl={true}
    >
      <BoundsController bounds={bounds} />
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
              bounds={tileBounds(rasterMapConfig, row, column)}
              opacity={0.9}
              zIndex={1}
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

          return locationOutlines.map((outline, idx) => (
            <Polygon
              key={`${locationId}-${idx}`}
              positions={
                outline.points.map((point) =>
                  toMapPoint(point, rasterMapConfig),
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
              {total > 0 && (
                <Popup maxWidth={300} minWidth={220}>
                  <div style={{ fontFamily: "inherit", padding: "2px 0" }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "baseline",
                        marginBottom: 8,
                      }}
                    >
                      <strong style={{ fontSize: 13 }}>
                        {firstOutline.locationName}
                      </strong>
                      {missing > 0 && (
                        <span
                          style={{
                            fontSize: 11,
                            color: "#d97706",
                            marginLeft: 8,
                          }}
                        >
                          {missing} missing
                        </span>
                      )}
                    </div>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(5, 1fr)",
                        gap: 4,
                      }}
                    >
                      {pokemonList.slice(0, 20).map((pokemon) => {
                        const isRegistered = registeredSet.has(
                          pokemon.speciesId,
                        );
                        return (
                          <button
                            key={`${pokemon.speciesId}-${pokemon.formName ?? "base"}`}
                            type="button"
                            onClick={() =>
                              onSelect(
                                pokemon.speciesId,
                                pokemon.formName ?? null,
                                gameId,
                              )
                            }
                            title={pokemon.displayName}
                            style={{
                              background: "none",
                              border: "none",
                              padding: 2,
                              cursor: "pointer",
                              borderRadius: 4,
                              opacity: isRegistered ? 1 : 0.4,
                            }}
                          >
                            <PokemonSprite
                              src={pokemon.spriteUrl}
                              alt={pokemon.displayName}
                              width={36}
                              height={36}
                              className="h-9 w-9"
                              style={{
                                imageRendering: "pixelated",
                                display: "block",
                              }}
                            />
                          </button>
                        );
                      })}
                    </div>
                    {pokemonList.length > 20 && (
                      <div
                        style={{
                          marginTop: 6,
                          fontSize: 11,
                          color: "#94a3b8",
                          textAlign: "center",
                        }}
                      >
                        +{pokemonList.length - 20} more
                      </div>
                    )}
                  </div>
                </Popup>
              )}
            </Polygon>
          ));
        },
      )}
    </MapContainer>
  );
}
