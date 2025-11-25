import React, { useEffect, useRef, memo } from "react";
import type { Id, Polygon } from "@/types";
import * as turf from "@turf/turf";
import type { Position } from "geojson";
import {
  amapPathToGeoJSONCoords,
  isPointInPolygon,
  bboxClip,
} from "@/utils/geo";
import { POLYGON_OPTIONS } from "@/components/MapContainer/index";
import { deepClone, uuid } from "@/utils/utils";

function isSamePoint(a: Position, b: Position, eps = 1e-6) {
  return Math.abs(a[0] - b[0]) < eps && Math.abs(a[1] - b[1]) < eps;
}

function findVertexIndex(coords: Position[][][], pt: Position) {
  for (let i = 0; i < coords.length; i++) {
    for (let j = 0; j < coords[i].length; j++) {
      for (let k = 0; k < coords[i][j].length; k++) {
        if (isSamePoint(coords[i][j][k], pt)) {
          return { ringIdx: i, lineIdx: j, ptIdx: k };
        }
      }
    }
  }
  return null;
}

function findEdgeIndex(coords: Position[][][], pt: Position) {
  for (let i = 0; i < coords.length; i++) {
    for (let j = 0; j < coords[i].length; j++) {
      const ring = coords[i][j];
      for (let k = 0; k < ring.length - 1; k++) {
        // 判断pt是否在ring[k]和ring[k+1]之间的线段上
        const a = ring[k],
          b = ring[k + 1];
        // 线段距离和点到两端距离之和近似等于点到两端距离
        const d1 = turf.distance(turf.point(a), turf.point(pt));
        const d2 = turf.distance(turf.point(b), turf.point(pt));
        const d = turf.distance(turf.point(a), turf.point(b));
        if (Math.abs(d - (d1 + d2)) < 1e-6) {
          return { ringIdx: i, lineIdx: j, edgeIdx: k };
        }
      }
    }
  }
  return null;
}

interface BrowseModeProps {
  map: any;
  AMap: any;
  polygons: Polygon[];
  selectedIds: Id[];
  boxFeature?: Polygon;
  onEditPolygon?: (id: Id, coordinates: Position[][][]) => void;
  pushHistory?: (behave: any) => void;
  editModeType?: "single" | "linked";
}

let movedPoint: Position = null;

export const EditMode: React.FC<BrowseModeProps> = memo(
  ({
    map,
    AMap,
    polygons,
    selectedIds,
    boxFeature,
    onEditPolygon,
    pushHistory,
    editModeType = "single",
  }) => {
    const editor = useRef<any>(null);
    const prePath = useRef<any>(null);
    const moveCircle = useRef<any>(null);

    useEffect(() => {
      return () => {
        if (prePath.current) {
          handleEnd();
        }
      };
    }, []);

    // 处理选中多边形变化，开启编辑模式
    useEffect(() => {
      if (!map || !onEditPolygon || selectedIds.length != 1) return;
      // // 关闭之前的编辑器
      // if (editor.current) {
      //   editor.current.close();
      //   editor.current = null;
      // }
      const overlays = map.getAllOverlays("polygon");

      const selectedPoly = overlays.find(
        (item) => item.getExtData()?.id === selectedIds[0]
      );
      // 此处拿到的selectedPoly的path可能会因为撤回等操作，不是最新的path，所以要重新设置下path
      if (selectedPoly) {
        selectedPoly.setPath(
          polygons.find((item) => item.id === selectedIds[0])?.geometry
            .coordinates
        );
      }

      prePath.current = selectedPoly?.getPath();

      const handleMove = (e: any) => {
        if (editModeType !== "linked") return;
        debugger;
        // 联动编辑逻辑入口
        const movedPt = movedPoint;
        polygons.forEach((poly) => {
          if (poly.id === selectedIds[0]) return;
          const coords = deepClone(poly.geometry.coordinates);
          // 顶点联动
          const vertex = findVertexIndex(coords, movedPt);
          if (vertex) {
            coords[vertex.ringIdx][vertex.lineIdx][vertex.ptIdx] = movedPt;
            if (onEditPolygon) {
              onEditPolygon(poly.id, coords);
            }
            return;
          }
          // 边界插入
          const edge = findEdgeIndex(coords, movedPt);
          if (edge) {
            coords[edge.ringIdx][edge.lineIdx].splice(
              edge.edgeIdx + 1,
              0,
              movedPt
            );
            if (onEditPolygon) {
              onEditPolygon(poly.id, coords);
            }
            return;
          }
        });
      };

      // 监听编辑过程中的事件，检查是否超出边界
      const handleAdjust = (e: any) => {
        if (!boxFeature) return;
        const movedPoint = [e.lnglat.lng, e.lnglat.lat];

        const coords = amapPathToGeoJSONCoords(e.target.getPath());
        const curPoly = turf.multiPolygon(coords) as Polygon;
        // 检查移动的点是否在bbox内
        const clipped = bboxClip(curPoly, boxFeature);
        pushHistory({
          features: [
            {
              ...polygons.find((item) => item.id === selectedIds[0]),
              geometry: clipped.geometry,
            },
          ],
          annotation: `edit`,
        });

        // 如果不在边界内，则结束编辑
        if (!isPointInPolygon(movedPoint, boxFeature)) {
          handleEnd();
        }
      };

      const handleMapClick = (e) => {
        const clickLngLat = e.lnglat; // 点击点的经纬度
        if (!selectedPoly.contains(clickLngLat)) {
          handleEnd();
        }
      };

      if (selectedPoly) {
        // 创建编辑器
        if (!editor.current) {
          editor.current = new AMap.PolygonEditor(map, selectedPoly, {
            controlPoint: {
              // 顶点
              radius: 4, // 半径，默认是 5
              strokeWeight: 1,
            },
            midControlPoint: {
              // 中间点
              strokeWeight: 1,
              radius: 3,
            },
            editOptions: POLYGON_OPTIONS.selOptions,
          });
        }

        // 设置吸附多边形（排除当前编辑的多边形）
        const adsorbPolygons = overlays.filter(
          (p) =>
            !p.getExtData()?.disabled &&
            p.getExtData()?.id !== selectedPoly.getExtData()?.id
        );

        editor.current.setAdsorbPolygons(adsorbPolygons);

        editor.current.setTarget(selectedPoly);
        // 开启编辑器
        editor.current.open();

        pushHistory({
          features: polygons.filter((p) => selectedIds.includes(p.id)),
          annotation: `edit add base`,
          isBase: true,
        });

        // 监听移动和编辑完成事件
        editor.current.on("adjust", handleAdjust);

        map.on("click", handleMapClick);
        map.on("mousemove", (e) => {
          console.log("map mousemove ");
          if (moveCircle.current) {
            handleMove(e);
          }
        });

        map
          .getLayers()
          .find((item) => item.CLASS_NAME == "AMap.VectorLayer")
          .getAllOverlays()
          .filter((item) => item.className == "Overlay.CircleMarker")
          .forEach((circle) => {
            circle.on("mousedown", (e) => {
              console.log("circle mousedown ");
              moveCircle.current = e.lnglat;
            });
          });
      }

      return () => {
        if (selectedPoly) {
          // if (editor.current.isOpenStatus) {
          //   editor.current.close();
          // }
          editor.current.off("adjust", handleAdjust);
          editor.current.off("addnode", handleAdjust);

          map.off("click", handleMapClick);
        }
      };
    }, [map, polygons, selectedIds, boxFeature]); // 添加bbox作为依赖

    const handleEnd = () => {
      editor.current?.close();
      const overlays = map.getAllOverlays("polygon");

      const selectedPoly = overlays.find(
        (item) => item.getExtData()?.id === selectedIds[0]
      );
      const newPath = selectedPoly.getPath();
      const newCoords = amapPathToGeoJSONCoords(newPath);
      const preCoords = amapPathToGeoJSONCoords(prePath.current);
      prePath.current = null;
      if (JSON.stringify(newCoords) === JSON.stringify(preCoords)) {
        return;
      }
      onEditPolygon(selectedPoly.getExtData()?.id, newCoords);
    };

    return null;
  }
);
