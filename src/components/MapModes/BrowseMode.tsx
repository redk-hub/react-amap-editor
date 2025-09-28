import React, { useEffect, useRef } from "react";
import type { Id, Polygon } from "@/types";
import type { Position } from "geojson";
import * as turf from "@turf/turf";
import { amapPathToGeoJSONCoords, isPointInPolygon } from "@/utils/geo";
import { getSnap } from "@/utils/snap";
interface BrowseModeProps {
  map: any;
  AMap: any;
  polygons: Polygon[];
  selectedIds: Id[];
  boxFeature?: Polygon;
  onSelectIds: (ids: Id[]) => void;
  onEditPolygon?: (id: Id, coordinates: [number, number][]) => void;
}

export const BrowseMode: React.FC<BrowseModeProps> = ({
  map,
  AMap,
  polygons,
  selectedIds,
  boxFeature,
  onSelectIds,
  onEditPolygon,
}) => {
  const editor = useRef<any>(null);
  const lastPath = useRef<Position[][]>([]); // 记录上一次的路径

  useEffect(() => {
    if (!map) return;
    // 点击地图空白处取消选择
    const handleMapClick = (e) => {
      const clickLngLat = e.lnglat; // 点击点的经纬度
      const polys = map.getAllOverlays("polygon");
      if (
        polys?.some(
          (item) => !item.getExtData()?.disabled && item.contains(clickLngLat)
        )
      ) {
        return;
      }
      onSelectIds([]);
    };
    map.on("click", handleMapClick);
    return () => {
      map.off("click", handleMapClick);
    };
  }, [map, AMap, onSelectIds]);

  // 处理选中多边形变化，开启编辑模式
  useEffect(() => {
    if (!map || !onEditPolygon || selectedIds.length != 1) return;
    // 关闭之前的编辑器
    if (editor.current) {
      editor.current.close();
      editor.current = null;
    }

    const overlays = map.getAllOverlays("polygon");
    const selectedPoly = overlays.find(
      (item) => item.getExtData()?.id === selectedIds[0]
    );

    const prePath = selectedPoly?.getPath();

    // 监听编辑过程中的事件，检查是否超出边界
    const handleMove = (e: any) => {
      if (!boxFeature) return;
      const movedPoint = [e.lnglat.lng, e.lnglat.lat];

      // 检查移动的点是否在bbox内
      if (!isPointInPolygon(movedPoint, boxFeature)) {
        const coords = amapPathToGeoJSONCoords(e.target.getPath());
        const clipped = turf.intersect(
          turf.featureCollection([turf.multiPolygon(coords), boxFeature])
        );
        e.target.setPath(clipped.geometry.coordinates);
        editor.current.setTarget(e.target);
      }
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

    if (selectedPoly) {
      lastPath.current = selectedPoly.getPath();
      // 创建编辑器
      editor.current = new AMap.PolygonEditor(map, selectedPoly, {
        controlPoint: {
          // 顶点
          radius: 5, // 半径，默认是 5
          strokeWeight: 1,
        },
        midControlPoint: {
          // 中间点
          strokeWeight: 1,
          radius: 3,
        },
      });

      // 设置吸附多边形（排除当前编辑的多边形）
      const adsorbPolygons = overlays.filter(
        (p) =>
          !p.getExtData()?.disabled &&
          p.getExtData()?.id !== selectedPoly.getExtData()?.id
      );

      editor.current.setAdsorbPolygons(adsorbPolygons);

      // 开启编辑器
      editor.current.open();

      // 监听移动和编辑完成事件
      editor.current.on("adjust", handleMove);
      editor.current.on("addnode", handleMove);
      editor.current.on("end", handleEnd);
    }

    return () => {
      if (selectedPoly) {
        editor.current.close();
        editor.current.off("adjust", handleMove);
        editor.current.off("addnode", handleMove);
        editor.current.off("end", handleEnd);
        editor.current = null;
      }
    };
  }, [map, selectedIds, onEditPolygon, boxFeature]); // 添加bbox作为依赖

  return null;
};
