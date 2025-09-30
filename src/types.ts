import type {
  Feature as TurfFeature,
  Polygon as TurfPolygon,
  MultiPolygon as TurfMultiPolygon,
  Position,
  Geometry,
} from "geojson";

// 扩展 Feature 类型，强制 id 为 string
export type Feature<T extends Geometry> = Omit<TurfFeature<T>, "id"> & {
  id: string;
};

export type DrawMode = "point" | "line" | "polygon" | "browse";

export interface AMapEditorRef {
  getCurrentState: () => { operate: string; feature: Polygon }[];
}

export interface AMapEditorProps {
  className?: string;
  style?: React.CSSProperties;
  amapKey: string;
  bbox?: Position[][][] | Position[][] | Position[];
  features?: Polygon[];
  selectedIds?: Id[];
  inactiveOnClickEmpty?: boolean;
  onSelect?: (ids: Id[]) => void;
  onMapReady?: (map: any) => void;
}

export type ToolMode = "browse" | "draw" | "clip" | "merge" | "edit";

export type PolygonProperties = {
  name?: string;
  code?: string;
};

export type Polygon = Feature<TurfMultiPolygon>;

export type Id = string;

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
  isBase?: boolean;
};

export type UndoOrRedoRes = {
  oldValue: Polygon | undefined;
  newValue: Polygon | undefined;
};
