import { EventBusProvider, useEventBus } from "@/utils/eventBus";
import { useEffect, useMemo, useState } from "react";
import MapContainer from "@/components/MapContainer";
import Toolbar from "@/components/Toolbar";
import ImportButton from "@/components/ImportButton";
import type { ToolMode, Id, UndoOrRedoRes, AMapEditorProps } from "@/types";
import useHistory from "@/hooks/useHistory";
import * as turf from "@turf/turf";
import { processPolygons } from "@/utils/geo";
import type { Feature, MultiPolygon, Polygon } from "geojson";

const AMapEditorContent: React.FC<AMapEditorProps> = ({
  amapKey,
  className,
  style,
  onDrawEnd,
  onSelect,
  toolbarPosition,
  modeButtonsPosition,
}) => {
  const bus = useEventBus();

  const [polygons, setPolygons] = useState<Feature<MultiPolygon>[]>([]);
  const [selectedIds, setSelectedIds] = useState<Id[]>([]);
  const [activeMode, setActiveMode] = useState<ToolMode>("browse");
  const [propertyTargetId, setPropertyTargetId] = useState<
    string | number | null
  >(null);

  const { pushHistory, undo, redo, disableUndo, disableRedo } = useHistory({});

  useEffect(() => {
    const handleUndoOrRedo = (value: UndoOrRedoRes[]) => {
      const oldVals = value.map((v) => v.oldValue).filter(Boolean);
      const newVals = value.map((v) => v.newValue).filter(Boolean);
      const oldIds = new Set(oldVals.map((v) => v.id));
      setPolygons((pre) => {
        const list = pre.filter((item) => !oldIds.has(item.id));
        return [...list, ...newVals];
      });
    };
    bus.on("history:undo", handleUndoOrRedo);
    bus.on("history:redo", handleUndoOrRedo);

    return () => {
      bus.off("history:undo", handleUndoOrRedo);
      bus.off("history:redo", handleUndoOrRedo);
    };
  }, []);

  const onDelete = () => {
    pushHistory({
      annotation: `delete ${selectedIds.join(",")}`,
      features: polygons
        .filter((p) => selectedIds.includes(p.id))
        .map((item) => ({ ...item, geometry: null })),
    });
    setPolygons((prev) => prev.filter((p) => !selectedIds.includes(p.id)));
    setSelectedIds([]);
    setPropertyTargetId(null);
  };

  const onModeChange = (mode: ToolMode) => {
    setActiveMode(mode);
    // setSelectedIds([]);
    // setPropertyTargetId(null);
  };

  const onMerge = () => {
    // 使用turf把选中的多边形合并
    if (selectedIds.length < 2) return;
    let selectedPolygons = polygons.filter((p) => selectedIds.includes(p.id));
    selectedPolygons = processPolygons(selectedPolygons);
    let merged: Feature<Polygon | MultiPolygon>;
    if (selectedPolygons.length == 1) {
      merged = selectedPolygons[0];
    } else {
      merged = turf.union(turf.featureCollection(selectedPolygons));
    }

    if (merged) {
      const cleaned = turf.cleanCoords(merged); // 清理多余的经纬度
      cleaned.id = String(Date.now()) + Math.random().toString(36).slice(2);
      if (cleaned.geometry.type === "Polygon") {
        cleaned.geometry = {
          type: "MultiPolygon",
          coordinates: [cleaned.geometry.coordinates],
        };
      }
      const next = polygons.filter((p) => !selectedIds.includes(p.id));

      next.push(cleaned);
      setPolygons(next);
      pushHistory({
        annotation: `merge ${selectedIds.join(",")}`,
        features: [
          ...selectedPolygons.map((item) => ({ ...item, geometry: null })),
          cleaned,
        ],
      });
      setSelectedIds([]);
    }
  };

  const onClip = () => {
    setActiveMode("clip");
  };

  const onImport = (imported) => {
    setPolygons((prev) => {
      const existingIds = new Set(prev.map((p) => p.id));
      const next = [...prev];
      const assignedIds: Id[] = [];

      // 使用批量处理优化性能
      const batchSize = 1000;
      for (let i = 0; i < imported.length; i += batchSize) {
        const batch = imported.slice(i, i + batchSize);
        for (const imp of batch) {
          let id = imp.id;
          if (existingIds.has(id) || !id) {
            id = String(Date.now()) + Math.random().toString(36).slice(2);
          }
          existingIds.add(id);
          next.push({ ...imp, id });
          assignedIds.push(id);
        }
      }

      // select imported items
      setSelectedIds(assignedIds);

      return next;
    });
  };

  return (
    <div
      className={className}
      style={{ position: "relative", ...(style || {}) }}
    >
      <div className="editor-header">
        <div style={{ color: "#fff", fontWeight: 600 }}>AMap GIS Editor</div>
        <Toolbar
          mode={activeMode}
          onModeChange={onModeChange}
          onUndo={!disableUndo ? undo : undefined}
          onRedo={!disableRedo ? redo : undefined}
          disabledUndo={disableUndo}
          disabledRedo={disableRedo}
          onMerge={onMerge}
          disabledMerge={selectedIds.length < 2}
          onClip={onClip}
          disabledClip={selectedIds.length != 1}
          onDelete={onDelete}
          disabledDelete={!selectedIds.length}
        />
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <ImportButton onImport={onImport} />
        </div>
      </div>
      <MapContainer
        amapKey={amapKey}
        mode={activeMode}
        polygons={polygons}
        pushHistory={pushHistory}
        onPolygonsChange={(next) => {
          setPolygons(next);
        }}
        selectedIds={selectedIds}
        onSelectIds={setSelectedIds}
        onOpenProperty={(id) => setPropertyTargetId(id)}
        onExitMode={() => setActiveMode("browse")}
      />
    </div>
  );
};

const AMapEditor: React.FC<AMapEditorProps> = (props) => {
  return (
    <EventBusProvider>
      <AMapEditorContent {...props} />
    </EventBusProvider>
  );
};

export default AMapEditor;
