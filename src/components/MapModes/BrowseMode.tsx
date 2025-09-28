import React, { useEffect, useRef } from "react";
import type { Id, Polygon } from "@/types";
interface BrowseModeProps {
  map: any;
  AMap: any;
  onSelectIds: (ids: Id[]) => void;
}

export const BrowseMode: React.FC<BrowseModeProps> = ({
  map,
  AMap,
  onSelectIds,
}) => {
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
  }, [map]);

  return null;
};
