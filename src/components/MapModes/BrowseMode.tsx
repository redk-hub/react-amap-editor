import React, { useEffect, useRef } from "react";
import type { Id, Polygon } from "@/types";
import * as turf from "@turf/turf";
import { amapPathToGeoJSONCoords } from "@/utils/geo";

interface BrowseModeProps {
  map: any;
  AMap: any;
  polygons: Polygon[];
  selectedIds: Id[];
  onSelectIds: (ids: Id[]) => void;
  onEditPolygon?: (id: Id, coordinates: [number, number][]) => void;
}

export const BrowseMode: React.FC<BrowseModeProps> = ({
  map,
  AMap,
  polygons,
  selectedIds,
  onSelectIds,
  onEditPolygon,
}) => {
  const editor = useRef<any>(null);

  useEffect(() => {
    if (!map) return;
    // 点击地图空白处取消选择
    const handleMapClick = (e) => {
      const clickLngLat = e.lnglat; // 点击点的经纬度
      const polys = map.getAllOverlays("polygon");
      if (polys?.some((item) => item.contains(clickLngLat))) {
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

    // 监听编辑完成事件
    const handleEnd = () => {
      const newPath = selectedPoly.getPath();

      const newCoords = amapPathToGeoJSONCoords(newPath);
      const preCoords = amapPathToGeoJSONCoords(prePath);
      if (
        turf.booleanEqual(
          turf.multiPolygon(newCoords),
          turf.multiPolygon(preCoords)
        )
      ) {
        return;
      }
      onEditPolygon(selectedPoly.getExtData()?.id, newCoords);
    };

    if (selectedPoly) {
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
        (p) => p.getExtData()?.id !== selectedPoly.getExtData()?.id
      );

      editor.current.setAdsorbPolygons(adsorbPolygons);

      // 开启编辑器
      editor.current.open();

      editor.current.on("end", handleEnd);
    }

    return () => {
      if (selectedPoly) {
        editor.current.close();
        editor.current = null;
        editor.current?.off("end", handleEnd);
      }
    };
  }, [map, selectedIds, polygons, onEditPolygon]); // polygons在撤销和重做时会变化，需要重新绑定编辑器

  return null;
};
