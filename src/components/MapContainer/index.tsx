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
  onStartClip: (line: Feature<LineString>) => void;
  onMapReady?: (map: any) => void;
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
  onStartClip,
  onMapReady,
}) => {
  const { map, AMap } = useAmap(CONTAINER_ID, {
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
    if (!map || !AMap || !boxFeature) return;
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
      if (poly && map) {
        map.remove(poly);
      }
    };
  }, [boxFeature, map, AMap]);

  useEffect(() => {
    if (!map || !AMap) return;

    const handleClick = (e: any) => {
      const id = e.target.getExtData()?.id;
      if (!id || window.editorMode == "draw") return;
      const polys = map.getAllOverlays("polygon");
      const clickPolys = polys.filter(
        (item) =>
          !item.getExtData()?.disabled &&
          !item.getExtData()?.readonly &&
          item.contains(e.lnglat)
      );
      const clickIds = clickPolys.map((item) => item.getExtData()?.id);
      if (!inactiveOnClickEmpty && clickIds.length === 0) {
        // 如果禁止点击空白处取消选择，且没有选中任何多边形，不做任何操作
        return;
      }
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
          onFinish={onStartClip}
        />
      )}
    </>
  );
};

export default MapContainer;
