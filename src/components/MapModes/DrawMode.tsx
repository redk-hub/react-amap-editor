import React, { useEffect, useRef } from "react";
import { getSnap } from "@/utils/snap";
import { isPointInPolygon } from "@/utils/geo";
import type { Polygon, Behave, UndoOrRedoRes } from "@/types";
import type { Position } from "geojson";
import * as turf from "@turf/turf";
import { uuid } from "@/utils/utils";
import { useEventBus } from "@/utils/eventBus";

interface DrawModeProps {
  map: any;
  AMap: any;
  polygons: Polygon[];
  boxFeature?: Polygon;
  onFinish: (feature: Polygon) => void;
  pushHistory: (behave: Behave) => void;
}

export const DrawMode: React.FC<DrawModeProps> = ({
  map,
  AMap,
  polygons,
  boxFeature,
  onFinish,
  pushHistory,
}) => {
  const bus = useEventBus();

  const drawing = useRef<{ active: boolean; points: Position[]; id: string }>({
    active: false,
    points: [],
    id: "temp_" + uuid(),
  });
  const tempLayer = useRef<any[]>([]);
  const snapThresholdPx = 10;

  useEffect(() => {
    const handleUndoOrRedo = (value: UndoOrRedoRes[]) => {
      if (!(value[0]?.newValue?.id as string)?.includes("temp")) return;
      if (value[0]?.newValue?.geometry?.coordinates?.length) {
        drawing.current.points = value[0].newValue.geometry.coordinates[0][0];
      } else {
        drawing.current.points = [];
      }
      drawTemp();
    };
    bus.on("history:undo", handleUndoOrRedo);
    bus.on("history:redo", handleUndoOrRedo);

    return () => {
      bus.off("history:undo", handleUndoOrRedo);
      bus.off("history:redo", handleUndoOrRedo);
    };
  }, []);

  useEffect(() => {
    if (!map || !AMap) return;

    map.setDefaultCursor("crosshair");

    const container = map.getContainer();

    const handleMove = (ev: MouseEvent) => {
      if (!drawing.current.active) return;
      const rect = container.getBoundingClientRect();
      const x = ev.clientX - rect.left;
      const y = ev.clientY - rect.top;
      const lnglat = map.containerToLngLat(new AMap.Pixel(x, y));
      drawTemp([lnglat.lng, lnglat.lat]);
    };

    const handleClick = (ev: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = ev.clientX - rect.left;
      const y = ev.clientY - rect.top;
      const lnglat = map.containerToLngLat(new AMap.Pixel(x, y));
      addPoint([lnglat.lng, lnglat.lat]);
    };

    const handleDblClick = () => {
      finishDraw();
    };

    const handleRightClick = () => {
      if (drawing.current.active) {
        finishDraw();
      }
    };

    container.addEventListener("mousemove", handleMove, { capture: true });
    container.addEventListener("click", handleClick, { capture: true });
    container.addEventListener("dblclick", handleDblClick, { capture: true });
    map.on("rightclick", handleRightClick);

    return () => {
      map.setDefaultCursor("default");
      map.setStatus({ dragEnable: true });
      container.removeEventListener("mousemove", handleMove, { capture: true });
      container.removeEventListener("click", handleClick, { capture: true });
      container.removeEventListener("dblclick", handleDblClick, {
        capture: true,
      });
      map.off("rightclick", handleRightClick);

      for (const ov of tempLayer.current) {
        map.remove(ov);
      }
    };
  }, [map, AMap, polygons]);

  const drawTemp = (cur?: Position) => {
    for (const ov of tempLayer.current) {
      map.remove(ov);
    }
    tempLayer.current = [];

    const pts = [...drawing.current.points];

    if (cur) {
      const snap = !isPointInPolygon(cur, boxFeature)
        ? getSnap(map, [boxFeature], cur, Infinity)?.lnglat
        : getSnap(map, polygons, cur, snapThresholdPx)?.lnglat;

      const dispCur = snap ? snap : cur;
      pts.push(dispCur);
    }
    if (pts.length < 2) {
      return;
    }

    if (pts.length === 2) {
      const polyline = new AMap.Polyline({
        path: pts,
        strokeColor: "#fa8c16",
        strokeDasharray: [8, 8],
        zIndex: 100,
      });
      map.add(polyline);
      tempLayer.current.push(polyline);
    } else if (drawing.current.points.length >= 2) {
      const polygon = new AMap.Polygon({
        path: [...pts, pts[0]],
        fillOpacity: 0.15,
        fillColor: "#fa8c16",
        strokeColor: "#fa8c16",
        zIndex: 90,
      });
      map.add(polygon);
      tempLayer.current.push(polygon);
    }
  };

  const addPoint = (lnglat: Position) => {
    if (!drawing.current.active) {
      drawing.current.active = true;
      map.setStatus({ dragEnable: false });
    }
    const snap = !isPointInPolygon(lnglat, boxFeature)
      ? getSnap(map, [boxFeature], lnglat, Infinity)?.lnglat
      : getSnap(map, polygons, lnglat, snapThresholdPx)?.lnglat;

    const pt = snap ? snap : lnglat;
    drawing.current.points.push(pt);
    pushHistory({
      annotation: "draw",
      features: [
        {
          type: "Feature",
          id: drawing.current.id,
          geometry: {
            type: "MultiPolygon",
            coordinates: [[[...drawing.current.points]]],
          },
          properties: {},
        },
      ],
    });
    drawTemp();
  };

  const finishDraw = () => {
    if (!drawing.current.active) return;
    const pts = drawing.current.points;

    for (const ov of tempLayer.current) {
      map.remove(ov);
    }
    tempLayer.current = [];

    if (pts.length < 3) {
      return;
    }

    // Check if final polygon is within boxFeature
    if (!isPointInPolygon(pts[pts.length - 1], boxFeature)) {
      return;
    }

    const feature = turf.multiPolygon(
      [[[...pts, pts[0]]]],
      {},
      { id: drawing.current.id.split("_")[1] }
    );
    onFinish(feature as Polygon);
    drawing.current = { active: false, id: "temp_" + uuid(), points: [] };
  };

  return null;
};
