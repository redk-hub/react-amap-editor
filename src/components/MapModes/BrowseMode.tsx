import React, { useEffect, useRef } from "react";
import type { Id, Polygon } from "@/types";
interface BrowseModeProps {
  map: any;
  AMap: any;
  inactiveOnClickEmpty?: boolean;
  onSelectIds: (ids: Id[]) => void;
}

export const BrowseMode: React.FC<BrowseModeProps> = ({
  map,
  AMap,
  inactiveOnClickEmpty, // 是否点击空白处取消选择
  onSelectIds,
}) => {
  useEffect(() => {
    if (!map || !inactiveOnClickEmpty) return;
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
  }, [map, inactiveOnClickEmpty]);

  return null;
};
