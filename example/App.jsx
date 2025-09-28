import React, { useState } from "react";
import { AMapEditor } from "../src";

const App = () => {
  const [log, setLog] = useState("");

  return (
    <div className="app-container" style={{ width: "100vw", height: "100vh" }}>
      <AMapEditor
        amapKey="cd4c46df876318f649075037f7e27cf3"
        style={{ width: "100%", height: "100%" }}
        onDrawEnd={(f) =>
          setLog("绘制完成: " + JSON.stringify(f.toGeoJSON?.()))
        }
        onSelect={(f) => setLog("选中: " + JSON.stringify(f.toGeoJSON?.()))}
        onDelete={(f, all) =>
          setLog(
            "删除: " + JSON.stringify(f.toGeoJSON?.()) + " 剩余: " + all.length
          )
        }
        bbox={[
          [
            [116.716203, 40.079011],
            [116.716203, 39.741667],
            [116.078653, 39.741667],
            [116.078653, 40.079011],
            [116.716203, 40.079011],
          ],
        ]}
        features={[
          {
            type: "Feature",
            id: "17588767860176cjj577lagp",
            properties: {},
            geometry: {
              type: "MultiPolygon",
              coordinates: [
                [
                  [
                    [116.162499, 40.019722],
                    [116.293838, 40.02334],
                    [116.27116, 39.874846],
                    [116.162499, 40.019722],
                  ],
                ],
              ],
            },
          },
          {
            type: "Feature",
            id: "175887678862192a4n9tyd0h",
            properties: {},
            geometry: {
              type: "MultiPolygon",
              coordinates: [
                [
                  [
                    [116.324074, 39.948771],
                    [116.445964, 39.988599],
                    [116.39494, 39.874846],
                    [116.324074, 39.948771],
                  ],
                ],
              ],
            },
          },
        ]}
      />
    </div>
  );
};

export default App;
