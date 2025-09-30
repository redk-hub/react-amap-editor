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
import ExportButton from "@/components/ExportButton";
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
import { processPolygons, coordsToMultiPolygon, bboxClip } from "@/utils/geo";
import type { LineString, MultiPolygon, Polygon, Position } from "geojson";

import { splitMultiPolygonByLine } from "@/utils/geo";
import { shakePolygon } from "@/utils/shake";

export interface AMapEditorRef {
  history: {
    getCurrentState: () => { operate: string; feature: PolygonFeature }[];
    initial: (features: PolygonFeature[], clear: boolean) => void;
    clear: () => void;
  };
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
    const {
      amapKey,
      className,
      style,
      center,
      zoom,
      mapStyle,
      bbox,
      features,
      selectedIds: propsSelectedIds,
      inactiveOnClickEmpty = true,
      tools,
      onSelect,
      onMapReady,
    } = props;
    const bus = useEventBus();
    const [polygons, setPolygons] = useState<Feature<MultiPolygon>[]>([]);
    const [selectedIds, setSelectedIds] = useState<Id[]>([]);
    const [activeMode, setActiveMode] = useState<ToolMode>("browse");
    const [map, setMap] = useState<any>(null);

    const {
      pushHistory,
      undo,
      redo,
      disableUndo,
      disableRedo,
      getCurrentState,
      initial,
      clearHistory,
    } = useHistory({});

    useImperativeHandle(ref, () => ({
      history: {
        getCurrentState,
        initial,
        clear: clearHistory,
      },
    }));

    const boxFeature = useMemo(() => {
      if (!bbox?.length) return null;
      return coordsToMultiPolygon(bbox);
    }, [bbox]);

    useEffect(() => {
      if (features) {
        setPolygons(features);
      }
    }, [features]);

    useEffect(() => {
      if (propsSelectedIds != undefined) {
        setSelectedIds(propsSelectedIds);
      }
    }, [propsSelectedIds]);

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

    const onSelectIds = (ids: Id[]) => {
      if (propsSelectedIds != undefined && onSelect) {
        onSelect(ids);
      } else {
        setSelectedIds(ids);
      }
    };

    const onDrawFinish = (feature: PolygonFeature) => {
      const clipped = bboxClip(feature, boxFeature);
      setPolygons([...polygons, clipped]);
      pushHistory({
        annotation: `draw finish ${clipped.id}`,
        features: [clipped],
      });
      console.log("draw finish", clipped);
    };

    const onEditPolygon = (id: string, coordinates: Position[][][]) => {
      setActiveMode("browse");
      // pushHistory({
      //   features: polygons.filter((item) => item.id == id),
      //   annotation: "add base",
      //   isBase: true,
      // });
      const newPolys = polygons.map((p) =>
        p.id === id ? { ...p, geometry: { ...p.geometry, coordinates } } : p
      );
      setPolygons(newPolys);
      // pushHistory({
      //   annotation: `edit ${id}`,
      //   features: newPolys.filter((p) => p.id == id),
      // });
    };

    const onDelete = () => {
      pushHistory({
        annotation: `add base delete ${selectedIds.join(",")}`,
        features: polygons.filter((p) => selectedIds.includes(p.id)),
        isBase: true,
      });
      pushHistory({
        annotation: `delete ${selectedIds.join(",")}`,
        features: polygons
          .filter((p) => selectedIds.includes(p.id))
          .map((item) => ({ ...item, geometry: null })),
      });
      setPolygons((prev) => prev.filter((p) => !selectedIds.includes(p.id)));
      onSelectIds([]);
    };

    const onStartClip = (line: Feature<LineString>) => {
      const feature = polygons.find((p) => selectedIds.includes(p.id));
      if (!feature) return;
      pushHistory({
        annotation: `add base clip ${feature.id}`,
        features: [feature],
        isBase: true,
      });
      const polys = splitMultiPolygonByLine(feature, line);
      const newPolys = polygons.filter((item) => item.id != feature.id);

      setPolygons([...newPolys, ...polys]);
      setActiveMode("browse");
      onSelectIds([]);
      pushHistory({
        annotation: `clip ${feature.id}`,
        features: [{ ...feature, geometry: null }, ...polys],
      });
    };

    const onMerge = () => {
      // 使用turf把选中的多边形合并
      if (selectedIds.length < 2) return;
      let selectedPolygons = polygons.filter((p) => selectedIds.includes(p.id));
      const newPolygons = processPolygons(selectedPolygons);
      let merged;
      if (newPolygons.length == 1) {
        merged = newPolygons[0];
      } else {
        merged = turf.union(turf.featureCollection(newPolygons)) as Feature<
          Polygon | MultiPolygon
        >;
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
          annotation: `add base merge ${selectedIds.join(",")}`,
          features: selectedPolygons,
          isBase: true,
        });
        pushHistory({
          annotation: `merge ${selectedIds.join(",")}`,
          features: [
            ...selectedPolygons.map((item) => ({ ...item, geometry: null })),
            cleaned,
          ],
        });
        onSelectIds([]);
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
        onSelectIds(assignedIds);

        return next;
      });
    };

    // 摇一摇功能
    const onShake = () => {
      if (!map || selectedIds.length === 0) return;

      const selectedPolygons = polygons.filter((p) =>
        selectedIds.includes(p.id)
      );
      if (selectedPolygons.length === 0) return;

      // 执行摇一摇操作，只对选中的多边形进行吸附

      for (const polygon of selectedPolygons) {
        shakePolygon(
          map,
          polygon,
          polygons.filter((item) => item.id != polygon.id),
          20
        ).then((shakenPolygon) => {
          if (!shakenPolygon) return;
          pushHistory({
            annotation: `摇一摇 add base ${polygon.id}`,
            features: [polygon],
            isBase: true,
          });
          setPolygons((pre) => {
            return pre.map((item) => {
              if (item.id === polygon.id) {
                return shakenPolygon;
              }
              return item;
            });
          });
          pushHistory({
            annotation: `摇一摇 ${shakenPolygon.id}`,
            features: [shakenPolygon],
          });
        });
      }
    };

    const onMapLoaded = (map) => {
      setMap(map);
      onMapReady?.(map);
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
            tools={tools}
            onModeChange={setActiveMode}
            onUndo={!disableUndo ? undo : undefined}
            onRedo={!disableRedo ? redo : undefined}
            disabledUndo={disableUndo}
            disabledRedo={disableRedo}
            onMerge={onMerge}
            disabledMerge={
              selectedIds.length < 2 || ["edit", "clip"].includes(activeMode)
            }
            onClip={() => setActiveMode("clip")}
            disabledClip={
              selectedIds.length != 1 || ["edit"].includes(activeMode)
            }
            onDelete={onDelete}
            disabledDelete={
              !selectedIds.length || ["edit", "clip"].includes(activeMode)
            }
            onShake={onShake}
            disabledShake={
              !selectedIds.length || ["edit", "clip"].includes(activeMode)
            }
            onEdit={() => setActiveMode("edit")}
            disabledEdit={
              selectedIds.length != 1 || ["clip"].includes(activeMode)
            }
          />
          <div className="editor-batch-wrap">
            {(!tools || tools?.includes("import")) && (
              <ImportButton onImport={onImport} />
            )}
            {(!tools || tools?.includes("export")) && (
              <ExportButton polygons={polygons} selectedIds={selectedIds} />
            )}
          </div>
        </div>
        <MapContainer
          amapKey={amapKey}
          center={center}
          zoom={zoom}
          mapStyle={mapStyle}
          mode={activeMode}
          polygons={polygons}
          selectedIds={selectedIds}
          boxFeature={boxFeature}
          inactiveOnClickEmpty={inactiveOnClickEmpty}
          onDrawFinish={onDrawFinish}
          onEditPolygon={onEditPolygon}
          pushHistory={pushHistory}
          onStartClip={onStartClip}
          onSelectIds={onSelectIds}
          onMapReady={onMapLoaded}
        />
      </div>
    );
  }
);

export default AMapEditor;
