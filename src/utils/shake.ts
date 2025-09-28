import type { Feature, Position } from "geojson";
import type { Polygon } from "@/types";
import * as turf from "@turf/turf";
import { getSnap } from "./snap";

/**
 * 计算两点之间的屏幕像素距离
 */
function getPixelDistance(
  map: any,
  point1: Position,
  point2: Position
): number {
  const pixel1 = map.lngLatToContainer(point1);
  const pixel2 = map.lngLatToContainer(point2);
  return Math.sqrt(
    Math.pow(pixel2.x - pixel1.x, 2) + Math.pow(pixel2.y - pixel1.y, 2)
  );
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
): Polygon | null {
  if (!map) return null;

  let hasChange = false;
  debugger;
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
}

/**
 * 批量摇一摇多个多边形
 */
export function shakePolygons(
  map: any,
  targetPolygons: Polygon[],
  allPolygons: Polygon[],
  threshold: number = 10
): Polygon[] {
  const result: Polygon[] = [];
  let hasAnyChanged = false;

  for (const polygon of targetPolygons) {
    const shakenPolygon = shakePolygon(map, polygon, allPolygons, threshold);
    if (shakenPolygon) {
      result.push(shakenPolygon);
      hasAnyChanged = true;
    } else {
      result.push(polygon);
    }
  }

  return hasAnyChanged ? result : targetPolygons;
}
