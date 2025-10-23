// src/utils/snap.ts
// Screen-pixel snapping utility against existing polygons' vertices and edges
import type { Polygon } from "@/types";
import type { Position } from "geojson";
import * as turf from "@turf/turf";

export type SnapTarget = {
  lnglat: Position;
  distPx: number;
};

export function getSnap(
  map: AMap.Map,
  candidates: Polygon[],
  pointLngLat: Position,
  thresholdPx = 10,
  vertexPriority = false //是否是顶点优化
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
    if (!vertexPriority || !best) {
      // edges
      for (let i = 0; i < coords.length - 1; i++) {
        const a = coords[i];
        const b = coords[i + 1];
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
  const EPS = 1e-10;
  // 修正浮点误差
  if (t < EPS) t = 0;
  else if (t > 1 - EPS) t = 1;

  const projX = ap.x + t * vx;
  const projY = ap.y + t * vy;

  const dist = Math.hypot(ptPix.x - projX, ptPix.y - projY);
  const projLngLat = map.containerToLngLat(new AMap.Pixel(projX, projY));
  return { lnglat: [projLngLat.lng, projLngLat.lat], distPx: dist };
}
