// src/hooks/useAmap.ts
import { useEffect, useRef, useState } from "react";
import AMapLoader from "@amap/amap-jsapi-loader";

export default function useAmap(containerId: string, key: string) {
  const [map, setMap] = useState<AMap.Map | null>(null);
  const amapRef = useRef<typeof AMap | null>(null);

  useEffect(() => {
    let disposed = false;
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

        const poly: any = new AMap.Polygon();
        poly.setOptions({
          path: [
            [
              [116.716203, 40.079011],
              [116.716203, 39.741667],
              [116.078653, 39.741667],
              [116.078653, 40.079011],
              [116.716203, 40.079011],
            ],
          ],
          fillOpacity: 0.3,
          fillColor: "#1677ff",
          strokeColor: "#1f1f1f",
          strokeWeight: 2,
          zIndex: 50,
        });
        map.add(poly);

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
  }, [containerId, key]);

  return { map, AMap: amapRef.current };
}
