import React from "react";
import { Button, Upload } from "@/components/base";
import { DownloadIcon } from "@/components/icons";
import type { Polygon } from "@/types";

type Props = {
  onImport: (polys: Polygon[]) => void;
};

const ImportButton: React.FC<Props> = ({ onImport }) => {
  const beforeUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const txt = String(reader.result || "");
        const obj = JSON.parse(txt);
        const polys: Polygon[] = [];

        const handleFeature = (feature: any) => {
          if (!feature || !feature.type || feature.type !== "Feature") return;
          const geom = feature.geometry;
          if (!geom) return;
          if (geom.type === "Polygon") {
            const f: Polygon = {
              ...feature,
              geometry: {
                type: "MultiPolygon",
                coordinates: [geom.coordinates],
              },
            };
            polys.push(f);
          }
        };

        if (obj.type === "FeatureCollection" && Array.isArray(obj.features)) {
          for (const f of obj.features) {
            handleFeature(f);
          }
        } else if (obj.type === "Feature") {
          handleFeature(obj);
        } else if (Array.isArray(obj)) {
          // array of features
          for (const f of obj) handleFeature(f);
        } else {
          alert("不支持的 GeoJSON 格式");
          return false;
        }

        if (polys.length === 0) {
          alert("未在文件中找到多边形要素");
          return false;
        }

        onImport(polys);
        alert(`成功导入 ${polys.length} 个多边形`);
        return true;
      } catch (err) {
        console.error(err);
        alert("解析文件失败，请选择有效的 GeoJSON 文件");
        return false;
      }
    };
    reader.onerror = (e) => {
      console.error(e);
      alert("读取文件失败");
    };
    reader.readAsText(file);

    return false;
  };

  return (
    <Upload
      beforeUpload={beforeUpload}
      accept=".geojson,.json,application/geo+json"
    >
      <Button icon={<DownloadIcon />}>导入</Button>
    </Upload>
  );
};

export default ImportButton;
