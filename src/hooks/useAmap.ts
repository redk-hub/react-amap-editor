// src/hooks/useAmap.ts
import { useEffect, useRef, useState } from "react";
import AMapLoader from "@amap/amap-jsapi-loader";
import { Position } from "geojson";

export default function useAmap(
  containerId: string,
  {
    amapKey,
    center,
    zoom,
    mapStyle,
  }: { amapKey: string; center?: Position; zoom?: number; mapStyle?: string }
) {
  const [map, setMap] = useState<AMap.Map | null>(null);
  const amapRef = useRef<typeof AMap | null>(null);

  useEffect(() => {
    let disposed = false;
    if (!amapKey) {
      console.warn("VITE_AMAP_KEY is not set. Map will not initialize.");
      return () => {
        disposed = true;
        if (map) map.destroy();
      };
    }
    AMapLoader.load({
      key: amapKey,
      version: "2.0",
      plugins: [
        "AMap.Scale",
        "AMap.ToolBar",
        "AMap.PolygonEditor",
        "AMap.MouseTool",
      ],
    })
      .then((AMapNS) => {
        if (disposed) return;
        amapRef.current = AMapNS;
        const map = new AMapNS.Map(containerId, {
          resizeEnable: true,
          zoom: zoom || 12,
          viewMode: "3D",
          center: center || [113.700141, 34.826034],
          doubleClickZoom: false,
          mapStyle: mapStyle, //"amap://styles/whitesmoke"
        });
        map.addControl(new AMapNS.Scale());
        map.addControl(new AMapNS.ToolBar());
        (window as any).map = map;

        setMap(map);
      })
      .catch((err) => {
        console.error("Failed to load AMap:", err);
      });
    return () => {
      disposed = true;
      if (map) map.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerId, amapKey, center, zoom, mapStyle]);

  return { map, AMap: amapRef.current };
}
