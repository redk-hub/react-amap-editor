import { EventBusProvider, useEventBus } from "@/utils/eventBus";
import {
  useEffect,
  useMemo,
  useState,
  forwardRef,
  useImperativeHandle,
} from "react";
import MapContainer from "@/components/MapContainer";
import Toolbar from "@/components/Toolbar";
import ImportButton from "@/components/ImportButton";
import type {
  ToolMode,
  Id,
  UndoOrRedoRes,
  AMapEditorProps,
  Polygon as PolygonFeature,
  Feature,
} from "@/types";
import useHistory from "@/hooks/useHistory";
import * as turf from "@turf/turf";
import { processPolygons, coordsToMultiPolygon } from "@/utils/geo";
import type { LineString, MultiPolygon, Polygon } from "geojson";

import { splitMultiPolygonByLine } from "@/utils/geo";

export interface AMapEditorRef {
  getUnSavedFeatures: () => { operate: string; feature: PolygonFeature }[];
}

const AMapEditor = forwardRef<AMapEditorRef, AMapEditorProps>((props, ref) => {
  return (
    <EventBusProvider>
      <AMapEditorContentWithRef {...props} ref={ref} />
    </EventBusProvider>
  );
});

const AMapEditorContentWithRef = forwardRef<AMapEditorRef, AMapEditorProps>(
  (props, ref) => {
    const { amapKey, className, style, bbox, onSelect } = props;
    const bus = useEventBus();
    const [polygons, setPolygons] = useState<Feature<MultiPolygon>[]>([]);
    const [selectedIds, setSelectedIds] = useState<Id[]>([]);
    const [activeMode, setActiveMode] = useState<ToolMode>("browse");

    const {
      pushHistory,
      undo,
      redo,
      disableUndo,
      disableRedo,
      getUnSavedFeatures,
      initial,
      clearHistory,
    } = useHistory({});

    useImperativeHandle(ref, () => ({
      getUnSavedFeatures,
      initial,
      clearHistory,
    }));

    const boxFeature = useMemo(() => {
      if (!bbox?.length) return null;
      return coordsToMultiPolygon(bbox);
    }, [bbox]);

    // Rest of the AMapEditorContent implementation
    useEffect(() => {
      const handleUndoOrRedo = (value: UndoOrRedoRes[]) => {
        const oldVals = value
          .map((v) => v.oldValue)
          .filter((item) => !!item && !item.id.includes("temp"));
        const newVals = value
          .map((v) => v.newValue)
          .filter((item) => !!item && !item.id.includes("temp"));
        const oldIds = new Set(oldVals.map((v) => v.id));
        if (oldVals.length === 0 && newVals.length === 0) return;
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

    const onDrawFinish = (feature: PolygonFeature) => {
      setPolygons([...polygons, feature]);
      pushHistory({
        annotation: `draw finish ${feature.id}`,
        features: [feature],
      });
    };

    const onEditPolygon = (id: string, coordinates: any) => {
      const newPolys = polygons.map((p) =>
        p.id === id ? { ...p, geometry: { ...p.geometry, coordinates } } : p
      );
      setPolygons(newPolys);
      pushHistory({
        annotation: `edit ${id}`,
        features: newPolys.filter((p) => p.id == id),
      });
    };

    const onDelete = () => {
      pushHistory({
        annotation: `delete ${selectedIds.join(",")}`,
        features: polygons
          .filter((p) => selectedIds.includes(p.id))
          .map((item) => ({ ...item, geometry: null })),
      });
      setPolygons((prev) => prev.filter((p) => !selectedIds.includes(p.id)));
      setSelectedIds([]);
    };

    const onStartClip = (line: Feature<LineString>) => {
      const feature = polygons.find((p) => selectedIds.includes(p.id));
      if (!feature) return;
      const polys = splitMultiPolygonByLine(feature, line);
      const newPolys = polygons.filter((item) => item.id != feature.id);

      setPolygons([...newPolys, ...polys]);
      setActiveMode("browse");
      setSelectedIds([]);
      pushHistory({
        annotation: `clip ${feature.id}`,
        features: [{ ...feature, geometry: null }, ...polys],
      });
    };

    const onMerge = () => {
      // 使用turf把选中的多边形合并
      if (selectedIds.length < 2) return;
      let selectedPolygons = polygons.filter((p) => selectedIds.includes(p.id));
      selectedPolygons = processPolygons(selectedPolygons);
      let merged;
      if (selectedPolygons.length == 1) {
        merged = selectedPolygons[0];
      } else {
        merged = turf.union(
          turf.featureCollection(selectedPolygons)
        ) as Feature<Polygon | MultiPolygon>;
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

    const onSelectIds = (clickIds: Id[]) => {
      setSelectedIds(clickIds);
      if (onSelect) {
        const selectedFeatures = polygons.filter((p) =>
          clickIds.includes(p.id)
        );
        onSelect(clickIds, selectedFeatures);
      }
    };

    return (
      <div
        className={className}
        style={{ position: "relative", ...(style || {}) }}
      >
        <div className="editor-header">
          <div className="editor-logo">AMap GIS Editor</div>
          <Toolbar
            mode={activeMode}
            onModeChange={setActiveMode}
            onUndo={!disableUndo ? undo : undefined}
            onRedo={!disableRedo ? redo : undefined}
            disabledUndo={disableUndo}
            disabledRedo={disableRedo}
            onMerge={onMerge}
            disabledMerge={selectedIds.length < 2}
            onClip={() => setActiveMode("clip")}
            disabledClip={selectedIds.length != 1}
            onDelete={onDelete}
            disabledDelete={!selectedIds.length}
          />
          <div className="editor-batch-wrap">
            <ImportButton onImport={onImport} />
          </div>
        </div>
        <MapContainer
          amapKey={amapKey}
          mode={activeMode}
          polygons={polygons}
          boxFeature={boxFeature}
          onDrawFinish={onDrawFinish}
          onEditPolygon={onEditPolygon}
          pushHistory={pushHistory}
          onStartClip={onStartClip}
          selectedIds={selectedIds}
          onSelectIds={onSelectIds}
        />
      </div>
    );
  }
);

export default AMapEditor;
