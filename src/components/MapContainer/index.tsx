import React, { useEffect, useRef } from "react";
import useAmap from "@/hooks/useAmap";
import { DrawMode, BrowseMode, ClipMode, EditMode } from "../MapModes";
import * as turf from "@turf/turf";
import type { Polygon, Feature, Id, ToolMode, Behave } from "@/types";
import type { LineString, Position } from "geojson";

const CONTAINER_ID = "amap-root";

export const POLYGON_OPTIONS = {
  selOptions: {
    fillOpacity: 0.3,
    fillColor: "#1677ff",
    strokeColor: "#fa8c16",
    strokeWeight: 2,
    zIndex: 60,
  },
  defaultOptions: {
    fillOpacity: 0.3,
    fillColor: "#1677ff",
    strokeColor: "#1f1f1f",
    strokeWeight: 2,
    zIndex: 50,
  },
};

interface Props {
  amapKey: string;
  center: Position;
  zoom: number;
  mapStyle: string;
  mode: ToolMode;
  polygons: Polygon[];
  selectedIds: Id[];
  boxFeature?: Polygon;
  inactiveOnClickEmpty?: boolean;
  nameSetting?: { field: string; style: any };
  onSelectIds: (ids: Id[]) => void;
  pushHistory: (behave: Behave) => void;
  onDrawFinish: (feature: Polygon) => void;
  onEditPolygon: (id: Id, coordinates: any) => void;
  onDrawLineClip: (line: Feature<LineString>) => void;
  onMapReady?: (map: any) => void;
  editModeType?: "single" | "linked";
}

const MapContainer: React.FC<Props> = ({
  amapKey,
  center,
  zoom,
  mapStyle,
  mode,
  polygons,
  selectedIds,
  boxFeature,
  inactiveOnClickEmpty,
  nameSetting,
  onSelectIds,
  pushHistory,
  onDrawFinish,
  onEditPolygon,
  onDrawLineClip,
  onMapReady,
  editModeType,
}) => {
  const { map, AMap, satelliteVisible, toggleSatellite } = useAmap(CONTAINER_ID, {
    amapKey,
    center,
    zoom,
    mapStyle,
  });
  const overlays = useRef<Map<Id, any>>(new Map());
  const namesLayer = useRef<any>(null);

  useEffect(() => {
    if (map && onMapReady) {
      onMapReady(map);
    }
  }, [map, onMapReady]);

  useEffect(() => {
    if (!map || !boxFeature) return;
    const poly: any = new AMap.Polygon();
    poly.setOptions({
      path: boxFeature.geometry.coordinates,
      fillOpacity: 0.001,
      fillColor: "red",
      strokeColor: "red",
      strokeWeight: 1,
      zIndex: 1,
      strokeStyle: "dashed",
      bubble: true, // 允许事件冒泡
      extData: { disabled: true }, // 所有的鼠标事件都需要过滤掉
    });

    map.add(poly);

    return () => {
      try {
        if (poly && map) {
          map.remove(poly);
        }
      } catch (error) {}
    };
  }, [boxFeature, map]);

  useEffect(() => {
    if (!map || !AMap) return;

    const handleClick = (e: any) => {
      const id = e.target.getExtData()?.id;
      if (!id || window.editorMode == "draw") return;
      const polys = map.getAllOverlays("polygon");
      let clickPolys = polys.filter(
        (item) => !item.getExtData()?.disabled && item.contains(e.lnglat)
      );
      if (!e.originEvent.shiftKey) {
        // 非多选模式下，过滤掉只读多边形
        clickPolys = clickPolys.filter((item) => !item.getExtData()?.readonly);
      }
      const clickIds = clickPolys.map((item) => item.getExtData()?.id);
      if (!inactiveOnClickEmpty && clickIds.length === 0) {
        // 如果禁止点击空白处取消选择，且没有选中任何多边形，不做任何操作
        return;
      }
      if (e.originEvent.shiftKey) {
        // shift + 点击实现多选

        // 合并两个数组，排除同时出现在两者中的元素
        const next = [...new Set([...selectedIds, ...clickIds])];

        onSelectIds(next);
      } else {
        onSelectIds(clickIds);
      }
    };

    // Sync overlays logic
    const keep = new Set<string | number>();
    for (const p of polygons) {
      keep.add(p.id);
      if (!overlays.current.has(p.id)) {
        const poly: any = new AMap.Polygon();
        poly.setOptions({
          path: p.geometry.coordinates,
          ...(selectedIds.includes(p.id)
            ? POLYGON_OPTIONS.selOptions
            : POLYGON_OPTIONS.defaultOptions),
          extData: { ...(p.properties || {}), id: p.id },
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
          // path: p.geometry.coordinates, // 在这写path经常会不生效
          ...(selectedIds.includes(p.id)
            ? POLYGON_OPTIONS.selOptions
            : POLYGON_OPTIONS.defaultOptions),
        });
        rec.polygon.setPath(p.geometry.coordinates);
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

    if (nameSetting) {
      addPolygonName(polygons);
    }

    // Cleanup
    return () => {
      for (const [id, rec] of overlays.current) {
        if (rec.clickHandler) rec.polygon.off("click", rec.clickHandler);
      }
      namesLayer.current?.clear();
    };
  }, [map, AMap, polygons, selectedIds, inactiveOnClickEmpty]);

  const addPolygonName = (polygons) => {
    if (!namesLayer.current) {
      namesLayer.current = new AMap.LabelsLayer({
        collision: true, // 是否避让
        opacity: 1,
        zIndex: 110,
        allowCollision: false,
      });
      map.add(namesLayer.current);
    }
    const markers = polygons.map((feature) => {
      if (!feature?.geometry) return;
      const name = feature.properties?.[nameSetting.field || "name"];
      const style = nameSetting.style || { fontSize: 12, fillColor: "#fff" };
      const centerpt = turf.centroid(feature);
      const lnglat = centerpt.geometry.coordinates;

      const text = new AMap.LabelMarker({
        position: lnglat as AMap.LngLatLike,
        text: {
          content: name,
          direction: "center",
          offset: [0, 0], // 调整文字位置
          style,
        },
      });
      return text;
    });
    namesLayer.current.add(markers);
  };

  return (
    <>
      <div id={CONTAINER_ID} className="map-root" />
      {mode == "browse" && (
        <BrowseMode
          map={map}
          AMap={AMap}
          inactiveOnClickEmpty={inactiveOnClickEmpty}
          onSelectIds={onSelectIds}
        />
      )}
      {mode == "edit" && (
        <EditMode
          map={map}
          AMap={AMap}
          pushHistory={pushHistory}
          polygons={polygons}
          selectedIds={selectedIds}
          boxFeature={boxFeature}
          onEditPolygon={onEditPolygon}
          editModeType={editModeType}
        />
      )}
      {mode === "draw" && (
        <DrawMode
          map={map}
          AMap={AMap}
          polygons={polygons}
          boxFeature={boxFeature}
          onFinish={onDrawFinish}
          pushHistory={pushHistory}
        />
      )}

      {mode === "clip" && (
        <ClipMode
          map={map}
          AMap={AMap}
          polygons={polygons}
          boxFeature={boxFeature}
          onFinish={onDrawLineClip}
        />
      )}

      <div
        className="satellite-toggle"
        onClick={toggleSatellite}
        title={satelliteVisible ? "关闭卫星地图" : "打开卫星地图"}
      >
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
        </svg>
      </div>
    </>
  );
};

export default MapContainer;
