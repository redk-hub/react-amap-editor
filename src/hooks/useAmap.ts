// src/hooks/useAmap.ts
import { useEffect, useRef, useState } from "react";
import AMapLoader from "@amap/amap-jsapi-loader";

export default function useAmap(containerId: string) {
  const [map, setMap] = useState<AMap.Map | null>(null);
  const amapRef = useRef<typeof AMap | null>(null);

  useEffect(() => {
    let disposed = false;
    const key = import.meta.env.VITE_AMAP_KEY as string | undefined;
    if (!key) {
      console.warn("VITE_AMAP_KEY is not set. Map will not initialize.");
      return () => {
        disposed = true;
        if (map) map.destroy();
      };
    }
    AMapLoader.load({
      key,
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
          zoom: 12,
          viewMode: "3D",
          center: [116.397428, 39.90923],
          doubleClickZoom: false,
          mapStyle: "amap://styles/whitesmoke",
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
  }, [containerId]);

  return { map, AMap: amapRef.current };
}
