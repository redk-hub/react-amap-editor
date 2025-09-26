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
      />
    </div>
  );
};

export default App;
