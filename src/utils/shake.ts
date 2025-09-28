import type { Feature, Position } from "geojson";
import type { Polygon } from "@/types";
import * as turf from "@turf/turf";
import { getSnap } from "./snap";

export function shakePolygonAnimation(polygon, map) {
  const overlay = map
    .getAllOverlays("polygon")
    .find((item) => item.getExtData()?.id === polygon?.id);
  return new Promise((resolve) => {
    const originalPath = overlay
      .getPath()
      .map((ringSet) => ringSet.map((ring) => ring.map((p) => [p.lng, p.lat])));

    let step = 0;
    const totalSteps = 20; // 2s / 50ms
    const interval = 10;
    const pixelOffset = 2;

    const timer = setInterval(() => {
      step++;
      const direction = step % 2 === 0 ? 1 : -1;

      const newPath = originalPath.map((ringSet) =>
        ringSet.map((ring) =>
          ring.map(([lng, lat]) => {
            const pixel = map.lngLatToContainer([lng, lat]);

            if (step % 4 === 0) {
              pixel.x += direction * pixelOffset; // 左右抖动
            } else {
              pixel.y += direction * pixelOffset; // 上下抖动
            }
            const newLngLat = map.containerToLngLat([pixel.x, pixel.y]);
            return [newLngLat.lng, newLngLat.lat];
          })
        )
      );

      overlay.setPath(newPath);

      if (step >= totalSteps) {
        clearInterval(timer);
        overlay.setPath(originalPath); // 恢复
        resolve(true);
      }
    }, interval);
  });
}

function findNearestSnapPoint(
  map,
  targetCoords: Position[][][] | Position[][] | Position[],
  allPolygons: Polygon[],
  threshold: number = 20,
  callback: (e: boolean) => void
) {
  return targetCoords.map((item) => {
    if (Array.isArray(item[0])) {
      return findNearestSnapPoint(map, item, allPolygons, threshold, callback);
    } else {
      const vertex = item as Position;
      const snap = getSnap(map, allPolygons, vertex, threshold);
      if (snap) {
        callback(true);
      }
      return snap ? snap.lnglat : vertex;
    }
  });
}

/**
 * 摇一摇功能：将选中的多边形吸附到周边多边形的边或顶点
 */
export function shakePolygon(
  map: any,
  targetPolygon: Polygon,
  allPolygons: Polygon[],
  threshold: number = 10
): Promise<Polygon | null> {
  if (!map) return null;
  return shakePolygonAnimation(targetPolygon, map).then((res) => {
    let hasChange = false;
    const { coordinates, type } = targetPolygon.geometry;
    const newCoords = findNearestSnapPoint(
      map,
      coordinates,
      allPolygons,
      threshold,
      (bool: boolean) => (hasChange = bool)
    );
    if (hasChange) {
      return { ...targetPolygon, geometry: { type, coordinates: newCoords } };
    }
    return null;
  });
}
