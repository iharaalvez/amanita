"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useMemo } from "react";
import { MapContainer, Polygon, Popup, Tooltip, useMap } from "react-leaflet";
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

  const allPoints = useMemo(
    () => visibleOutlines.flatMap((o) => o.points),
    [visibleOutlines],
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
              // PokeDB exports Leaflet coordinates as [lat, lng].
              // If polygons appear vertically mirrored, negate the lat values here.
              positions={outline.points as L.LatLngExpression[]}
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
