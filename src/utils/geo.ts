// src/utils/geo.ts

import * as turf from "@turf/turf";

import { Feature, Polygon } from "../types";
import type { MultiPolygon, LineString, Position } from "geojson";

// 高德poly.getpath转换成geojson的coords
export function amapPathToGeoJSONCoords(path) {
  // path 可能是一维或二维
  if (!path || path.length === 0) return [];
  return path.map((item) => {
    if (Array.isArray(item)) {
      return amapPathToGeoJSONCoords(item);
    } else {
      return [item.lng, item.lat];
    }
  });
}

/**
 * 用 LineString 切割 MultiPolygon，返回多个 MultiPolygon
 * @param multiPolygonFeature Feature<MultiPolygon>
 * @param cutterLineFeature Feature<LineString>
 * @param bufferSize 切割线缓冲宽度，单位 km，默认 1e-10
 */
export function splitMultiPolygonByLine(
  multiPolygonFeature: Feature<MultiPolygon>,
  cutterLineFeature: Feature<LineString>,
  bufferSize = 1e-10
): Feature<MultiPolygon>[] {
  // 1. 给切割线生成极细 buffer
  const cutterBuffer = turf.buffer(cutterLineFeature, bufferSize, {
    units: "kilometers",
  });

  const results: Feature<MultiPolygon>[] = [];

  // 2. 差集 => 切掉切割线
  const diff = turf.difference(
    turf.featureCollection([multiPolygonFeature, cutterBuffer])
  );
  if (diff) {
    // diff 可能是 Polygon 或 MultiPolygon
    if (diff.geometry.type === "Polygon") {
      results.push({
        type: "Feature",
        id: String(Date.now()) + Math.random().toString(36).slice(2),
        properties: {},
        geometry: {
          type: "MultiPolygon",
          coordinates: [diff.geometry.coordinates],
        },
      });
    } else if (diff.geometry.type === "MultiPolygon") {
      results.push(
        ...diff.geometry.coordinates.map((path): Feature<MultiPolygon> => {
          return {
            type: "Feature",
            id: String(Date.now()) + Math.random().toString(36).slice(2),
            properties: {},
            geometry: {
              type: "MultiPolygon",
              coordinates: [path],
            },
          };
        })
      );
    }
  }
  // 减少经度，消除buffer带来的影响
  results.forEach((item) => {
    item.geometry.coordinates = weakAccuracy(item.geometry.coordinates);
  });
  return results;
}

function weakAccuracy(path) {
  // path 可能是一维或二维
  if (!path || path.length === 0) return [];
  return path.map((item) => {
    if (Array.isArray(item) && typeof item[0] != "number") {
      return weakAccuracy(item);
    } else {
      return [Number(item[0].toFixed(6)), Number(item[1].toFixed(6))]; // 保留6位小数
    }
  });
}

/**
 * 处理多边形数组，检测包含关系并挖洞
 * @param {Array} polygons - GeoJSON Polygon Feature 数组
 * @returns {Array} 更新后的多边形数组
 */
export function processPolygons(polygons) {
  // 复制输入数组，避免修改原数据
  let result = [...polygons];

  // 标志是否需要继续检查（可能有嵌套包含）
  let hasContainment = true;

  while (hasContainment) {
    hasContainment = false;

    // 双重循环检查每对多边形
    for (let i = 0; i < result.length; i++) {
      if (!result[i]) continue; // 跳过已删除的多边形
      for (let j = 0; j < result.length; j++) {
        if (i === j || !result[j]) continue; // 跳过相同或已删除的多边形

        const polyA = result[i];
        const polyB = result[j];
        // 把polyB从multipolygon转成polygon,如果polyB不是polygon,则跳过
        if (polyB.geometry.type === "MultiPolygon") {
          if (polyB.geometry.coordinates.length === 1) {
            polyB.geometry = {
              type: "Polygon",
              coordinates: polyB.geometry.coordinates[0],
            };
          } else {
            // 多个polygon,
            continue; // 跳过
          }
        }

        // 检查 A 是否完全包含 B
        if (turf.booleanContains(polyA, polyB)) {
          // 用 B 在 A 上挖洞
          const newPolygon = turf.difference(
            turf.featureCollection([polyA, polyB])
          );

          // 移除 A 和 B（标记为 null）
          result[i] = null;
          result[j] = null;

          // 插入新多边形（如果 difference 成功）
          if (newPolygon) {
            result.push(newPolygon);
          }

          hasContainment = true; // 标记需要重新检查
          break; // 跳出内层循环，重新开始
        }
      }
      if (hasContainment) break; // 找到一对后重新开始
    }

    // 过滤掉 null（已删除的多边形）
    result = result.filter((poly) => poly !== null);
  }

  return result;
}

/**
 * 将各种维度的坐标转换为MultiPolygon
 */
export function coordsToMultiPolygon(
  coords: Position[][][] | Position[][] | Position[]
): Feature<MultiPolygon> {
  if (!coords?.length) return turf.multiPolygon([]) as Feature<MultiPolygon>;

  if (typeof coords[0][0] === "number") {
    return turf.multiPolygon([
      [coords],
    ] as Position[][][]) as Feature<MultiPolygon>;
  }

  // 处理LineString/Polygon坐标 [[lng, lat], ...]
  if (typeof coords[0][0][0] === "number") {
    return turf.multiPolygon([coords as Position[][]]) as Feature<MultiPolygon>;
  }

  return turf.multiPolygon(coords as Position[][][]) as Feature<MultiPolygon>;
}

/**
 * 检查点是否在边界内
 */
export function isPointInPolygon(
  point: Position,
  boxFeature: Polygon
): boolean {
  if (!boxFeature) return true;
  const pt = turf.point(point);
  return turf.booleanPointInPolygon(pt, boxFeature);
}

/**
 * 用boxFeature裁切feature
 * @param feature
 * @param boxFeature
 * @returns
 */
export function bboxClip(feature: Polygon, boxFeature: Polygon): Polygon {
  const clipped = boxFeature
    ? turf.intersect(turf.featureCollection([feature, boxFeature]))
    : feature;
  if (clipped.geometry.type === "Polygon") {
    clipped.geometry = {
      type: "MultiPolygon",
      coordinates: [clipped.geometry.coordinates],
    };
  }
  return { ...feature, geometry: clipped.geometry } as Polygon;
}
