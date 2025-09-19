import React, { useEffect, useRef } from "react";
import useAmap from "@/hooks/useAmap";
import { DrawMode, BrowseMode, ClipMode } from "../MapModes";

import type { Polygon, Id, ToolMode } from "@/types";
import type { LineString, Feature } from "geojson";
import type { Behave } from "@/types";

const CONTAINER_ID = "amap-root";

interface Props {
  amapKey: string;
  mode: ToolMode;
  polygons: Polygon[];
  selectedIds: Id[];
  onSelectIds: (ids: Id[]) => void;
  pushHistory: (behave: Behave) => void;
  onDrawFinish: (feature: Polygon) => void;
  onEditPolygon: (id: Id, coordinates: any) => void;
  onStartClip: (line: Feature<LineString>) => void;
}

const MapContainer: React.FC<Props> = ({
  amapKey,
  mode,
  polygons,
  selectedIds,
  onSelectIds,
  pushHistory,
  onDrawFinish,
  onEditPolygon,
  onStartClip,
}) => {
  const { map, AMap } = useAmap(CONTAINER_ID, amapKey);
  const overlays = useRef<Map<Id, any>>(new Map());

  useEffect(() => {
    if (!map || !AMap) return;

    const handleClick = (e: any) => {
      const id = e.target.getExtData()?.id;
      if (!id || mode == "draw") return;
      const polys = map.getAllOverlays("polygon");
      const clickPolys = polys.filter((item) => item.contains(e.lnglat));
      const clickIds = clickPolys.map((item) => item.getExtData()?.id);
      if (e.originEvent.shiftKey) {
        // shift + 点击实现多选
        const existSet = new Set(selectedIds);
        const clickSet = new Set(clickIds);
        // 合并两个数组，排除同时出现在两者中的元素
        const next = [
          ...[...existSet].filter((item) => !clickSet.has(item)),
          ...[...clickSet].filter((item) => !existSet.has(item)),
        ];

        onSelectIds(next);
      } else {
        onSelectIds(clickIds);
      }
    };

    const selOptions = {
      fillOpacity: 0.3,
      fillColor: "#1677ff",
      strokeColor: "#fa8c16",
      strokeWeight: 2,
      zIndex: 60,
    };
    const defaultOptions = {
      fillOpacity: 0.3,
      fillColor: "#1677ff",
      strokeColor: "#1f1f1f",
      strokeWeight: 2,
      zIndex: 50,
    };

    // Sync overlays logic
    const keep = new Set<string | number>();
    for (const p of polygons) {
      keep.add(p.id);
      if (!overlays.current.has(p.id)) {
        const poly: any = new AMap.Polygon();
        poly.setOptions({
          path: p.geometry.coordinates,
          ...(selectedIds.includes(p.id) ? selOptions : defaultOptions),
          extData: { id: p.id },
        });
        poly.on("click", handleClick);
        map.add(poly);
        overlays.current.set(p.id, {
          polygon: poly,
          clickHandler: handleClick,
        });
      } else {
        // Update existing overlay
        const rec = overlays.current.get(p.id)!;
        rec.polygon.setOptions({
          path: p.geometry.coordinates,
          ...(selectedIds.includes(p.id) ? selOptions : defaultOptions),
        });
        rec.polygon.on("click", handleClick);
        overlays.current.set(p.id, {
          polygon: rec.polygon,
          clickHandler: handleClick,
        });
      }
    }

    // 找到overlays存在，但是polygons不存在的overlay，移除
    for (const [id, rec] of overlays.current) {
      if (!keep.has(id)) {
        map.remove(rec.polygon);
        overlays.current.delete(id);
      }
    }

    // Cleanup
    return () => {
      for (const [id, rec] of overlays.current) {
        if (rec.clickHandler) rec.polygon.off("click", rec.clickHandler);
      }
    };
  }, [map, AMap, mode, polygons, selectedIds, onSelectIds]);

  return (
    <>
      <div id={CONTAINER_ID} className="map-root" />
      {mode == "browse" && (
        <BrowseMode
          map={map}
          AMap={AMap}
          polygons={polygons}
          selectedIds={selectedIds}
          onSelectIds={onSelectIds}
          onEditPolygon={onEditPolygon}
        />
      )}
      {mode === "draw" && (
        <DrawMode
          map={map}
          AMap={AMap}
          polygons={polygons}
          onFinish={onDrawFinish}
          pushHistory={pushHistory}
        />
      )}

      {mode === "clip" && (
        <ClipMode
          map={map}
          AMap={AMap}
          polygons={polygons}
          onFinish={onStartClip}
        />
      )}
    </>
  );
};

export default MapContainer;
