// src/components/ExportButton/index.tsx
import React from "react";
import { Button } from "@/components/base";

import type { Polygon } from "@/types";

type Props = {
  polygons: Polygon[];
  selectedIds: string[];
};

const ExportButton: React.FC<Props> = ({ polygons, selectedIds }) => {
  const handleExport = () => {
    const list = selectedIds.length
      ? polygons.filter((p) => selectedIds.includes(p.id))
      : polygons;
    const blob = new Blob(
      [JSON.stringify({ type: "FeatureCollection", features: list }, null, 2)],
      {
        type: "application/json",
      }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.download = `polygons-${Date.now()}.geojson`;
    a.href = url;
    a.click();
    URL.revokeObjectURL(url);
  };
  return <Button onClick={handleExport}>导出</Button>;
};

export default ExportButton;
