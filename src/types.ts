import type {
  Feature as TurfFeature,
  Polygon as TurfPolygon,
  MultiPolygon as TurfMultiPolygon,
  Position,
  Geometry,
} from "geojson";

declare global {
  interface Window {
    map: any;
    editorMode: string;
  }
}

// 扩展 Feature 类型，强制 id 为 string
export type Feature<T extends Geometry> = Omit<TurfFeature<T>, "id"> & {
  id: string;
};

export type DrawMode = "point" | "line" | "polygon" | "browse";

export type Menu =
  | "draw"
  | "edit"
  | "clip"
  | "merge"
  | "shake"
  | "delete"
  | "undo"
  | "redo"
  | "import"
  | "export";

export interface AMapEditorRef {
  getCurrentState: () => { operate: string; feature: Polygon }[];
}

export interface PolygonChange {
  type: Menu;
  beforeChanges: Polygon[];
  afterChanges: Polygon[];
}

export interface AMapEditorProps {
  className?: string;
  style?: React.CSSProperties;
  amapKey: string;
  center?: Position;
  zoom?: number;
  mapStyle?: string;
  bbox?: Position[][][] | Position[][] | Position[];
  features?: TurfFeature<TurfPolygon>[] | TurfFeature<TurfMultiPolygon>[];
  selectedIds?: Id[];
  inactiveOnClickEmpty?: boolean;
  tools?: Menu[];
  isContinuousDraw?: boolean; // 绘制完成后是否继续保持绘制模式
  nameSetting?: { field: string; style: any }; // polygon名称属性设置
  onSelect?: (ids: Id[]) => void;
  onMapReady?: (map: any) => void;
  onChange?: (e: PolygonChange) => void;
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
