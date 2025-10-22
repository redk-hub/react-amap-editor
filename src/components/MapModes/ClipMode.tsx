import React, { useEffect, useRef } from "react";
import { getSnap } from "@/utils/snap";
import type { Polygon } from "@/types";
import type { LineString, Position, Feature } from "geojson";
import * as turf from "@turf/turf";

interface ClipModeProps {
  map: any;
  AMap: any;
  polygons: Polygon[];
  boxFeature?: Polygon;
  onFinish: (feature: Feature<LineString>) => void;
}

export const ClipMode: React.FC<ClipModeProps> = ({
  map,
  AMap,
  polygons,
  boxFeature,
  onFinish,
}) => {
  const drawing = useRef<{ active: boolean; points: Position[] }>({
    active: false,
    points: [],
  });
  const tempLayer = useRef<any[]>([]);
  const snapThresholdPx = 10;

  useEffect(() => {
    if (!map || !AMap) return;

    map.setDefaultCursor("crosshair");

    const container = map.getContainer();

    const drawTemp = (cur: Position) => {
      for (const ov of tempLayer.current) {
        map.remove(ov);
      }
      tempLayer.current = [];

      const pts = [...drawing.current.points, cur];
      if (pts.length === 1) {
        const marker = new AMap.Marker({
          position: pts[0],
          offset: new AMap.Pixel(-4, -4),
        });
        map.add(marker);
        tempLayer.current.push(marker);
        return;
      }

      const snap = getSnap(map, polygons, cur, snapThresholdPx);
      const dispCur = snap ? snap.lnglat : cur;

      const polyline = new AMap.Polyline({
        path: [...drawing.current.points, dispCur],
        strokeColor: "#fa8c16",
        strokeDasharray: [8, 8],
        zIndex: 100,
      });
      map.add(polyline);
      tempLayer.current.push(polyline);
    };

    const addPoint = (lnglat: [number, number]) => {
      if (!drawing.current.active) {
        drawing.current.active = true;
        map.setStatus({ dragEnable: false });
      }

      const snap = getSnap(map, polygons, lnglat, snapThresholdPx);
      const pt = snap ? snap.lnglat : lnglat;
      drawing.current.points.push(pt);
      drawTemp(pt);
    };

    const finishDraw = () => {
      if (!drawing.current.active) return;
      const pts = drawing.current.points;
      drawing.current = { active: false, points: [] };

      for (const ov of tempLayer.current) {
        map.remove(ov);
      }
      tempLayer.current = [];

      if (pts.length < 2) {
        return;
      }

      const feature = turf.lineString(pts);
      onFinish(feature);
    };

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
      console.log("dblclick finnish clip");
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
  }, [map, AMap, polygons, onFinish]);

  return null;
};
