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
interface BrowseModeProps {
  map: any;
  AMap: any;
  polygons: Polygon[];
  selectedIds: Id[];
  boxFeature?: Polygon;
  onEditPolygon?: (id: Id, coordinates: Position[][][]) => void;
  pushHistory?: (behave: any) => void;
}

export const EditMode: React.FC<BrowseModeProps> = memo(
  ({
    map,
    AMap,
    polygons,
    selectedIds,
    boxFeature,
    onEditPolygon,
    pushHistory,
  }) => {
    const editor = useRef<any>(null);

    useEffect(() => {
      return () => {
        editor.current?.close();
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

      const prePath = selectedPoly?.getPath();

      // 监听编辑过程中的事件，检查是否超出边界
      const handleMove = (e: any) => {
        if (!boxFeature) return;
        const movedPoint = [e.lnglat.lng, e.lnglat.lat];

        const coords = amapPathToGeoJSONCoords(e.target.getPath());
        // 检查移动的点是否在bbox内
        const clipped = bboxClip(
          turf.multiPolygon(coords) as Polygon,
          boxFeature
        );
        e.target.setPath(clipped.geometry.coordinates);
        editor.current.setTarget(e.target);
        pushHistory({
          features: [
            {
              ...polygons.find((item) => item.id === selectedIds[0]),
              geometry: clipped.geometry,
            },
          ],
          annotation: `edit`,
        });
      };

      // 监听编辑完成事件
      const handleEnd = () => {
        const newPath = selectedPoly.getPath();
        const newCoords = amapPathToGeoJSONCoords(newPath);
        const preCoords = amapPathToGeoJSONCoords(prePath);
        if (JSON.stringify(newCoords) === JSON.stringify(preCoords)) {
          return;
        }
        onEditPolygon(selectedPoly.getExtData()?.id, newCoords);
      };

      const handleMapClick = (e) => {
        const clickLngLat = e.lnglat; // 点击点的经纬度
        if (!selectedPoly.contains(clickLngLat)) {
          editor.current?.close();
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
        editor.current.on("adjust", handleMove);
        // editor.current.on("addnode", handleMove);
        editor.current.on("end", handleEnd);
        map.on("click", handleMapClick);
      }

      return () => {
        if (selectedPoly) {
          // if (editor.current.isOpenStatus) {
          //   editor.current.close();
          // }
          editor.current.off("adjust", handleMove);
          editor.current.off("addnode", handleMove);
          editor.current.off("end", handleEnd);

          map.off("click", handleMapClick);
        }
      };
    }, [map, polygons, selectedIds, boxFeature]); // 添加bbox作为依赖

    return null;
  }
);
