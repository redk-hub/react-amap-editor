// src/utils/snap.ts
// Screen-pixel snapping utility against existing polygons' vertices and edges
import type { Polygon } from "@/types";
import type { Position } from "geojson";

export type SnapTarget = {
  lnglat: Position;
  distPx: number;
};

export function getSnap(
  map: AMap.Map,
  candidates: Polygon[],
  pointLngLat: Position,
  thresholdPx = 10
): SnapTarget | null {
  const ptPix = map.lngLatToContainer(pointLngLat);
  let best: SnapTarget | null = null;

  for (const poly of candidates) {
    const { coordinates, type } = poly.geometry;
    let coords: Position[];
    if (type == "MultiPolygon") {
      coords = coordinates.flatMap((polygon) =>
        polygon.flatMap((ring) => ring.map(([lng, lat]) => [lng, lat]))
      );
    }
    // else {
    //   coords = coordinates.flatMap((ring) =>
    //     ring.map(([lng, lat]) => [lng, lat])
    //   );
    // }
    // vertices
    for (const c of coords) {
      const vPix = map.lngLatToContainer(c);
      const d = Math.hypot(ptPix.x - vPix.x, ptPix.y - vPix.y);
      if (d < thresholdPx && (!best || d < best.distPx)) {
        best = { lnglat: c, distPx: d };
      }
    }
    // edges
    for (let i = 0; i < coords.length; i++) {
      const a = coords[i];
      const b = coords[(i + 1) % coords.length];
      const snapOnSeg = nearestPointOnSegmentPx(map, a, b, ptPix);
      if (
        snapOnSeg &&
        snapOnSeg.distPx < thresholdPx &&
        (!best || snapOnSeg.distPx < best.distPx)
      ) {
        best = { lnglat: snapOnSeg.lnglat, distPx: snapOnSeg.distPx };
      }
    }
  }
  return best;
}

function nearestPointOnSegmentPx(
  map: AMap.Map,
  a: Position,
  b: Position,
  ptPix: AMap.Pixel
): { lnglat: Position; distPx: number } | null {
  const ap = map.lngLatToContainer(a);
  const bp = map.lngLatToContainer(b);

  const vx = bp.x - ap.x;
  const vy = bp.y - ap.y;
  const wx = ptPix.x - ap.x;
  const wy = ptPix.y - ap.y;

  const len2 = vx * vx + vy * vy;
  if (len2 === 0) return null;

  let t = (wx * vx + wy * vy) / len2;
  t = Math.max(0, Math.min(1, t));

  const projX = ap.x + t * vx;
  const projY = ap.y + t * vy;

  const dist = Math.hypot(ptPix.x - projX, ptPix.y - projY);
  const projLngLat = map.containerToLngLat(new AMap.Pixel(projX, projY));
  return { lnglat: [projLngLat.lng, projLngLat.lat], distPx: dist };
}
