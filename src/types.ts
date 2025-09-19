export type DrawMode = "point" | "line" | "polygon" | "browse";

export interface AMapEditorProps {
  amapKey: string;
  mode?: DrawMode;
  onDrawEnd?: (feature: any) => void;
  onSelect?: (feature: any) => void;
  onDelete?: (feature: any, allFeatures: any[]) => void;
  toolbarPosition?: React.CSSProperties;
  modeButtonsPosition?: React.CSSProperties;
}

import type {
  Feature,
  Polygon as TurfPolygon,
  MultiPolygon as TurfMultiPolygon,
  Position,
} from "geojson";

export type ToolMode = "browse" | "draw" | "clip" | "merge" | "edit";

export type PolygonProperties = {
  name?: string;
  code?: string;
};

export type Polygon = Feature<TurfMultiPolygon>;

export type Id = string | number;

export type PolygonFeature = {
  id: string;
  properties: PolygonProperties;
  // Ring of [lng, lat] coordinates. Only single-ring polygons supported for simplicity.
  coordinates: Position[][] | Position[][][];
  // Cached Turf polygon feature for operations
  feature?: Feature<TurfPolygon>;
  // Render state flags
  highlighted?: boolean;
};

export type HistoryState = {
  polygons: PolygonFeature[];
  selectedIds: string[];
};

export type Behave = {
  annotation?: string;
  features: Polygon[];
};

export type UndoOrRedoRes = {
  oldValue: Polygon | undefined;
  newValue: Polygon | undefined;
};
