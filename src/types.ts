import type {
  Feature as TurfFeature,
  Polygon as TurfPolygon,
  MultiPolygon as TurfMultiPolygon,
  Position,
  Geometry,
} from "geojson";

declare global {
  interface Window {
    map: any; // 高德地图实例
    editorMode: string; // 编辑器当前模式
  }
}

// 扩展 Feature 类型，强制 id 为 string
export type Feature<T extends Geometry> = Omit<TurfFeature<T>, "id"> & {
  id: string;
};

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
  className?: string; // 容器类名
  style?: React.CSSProperties; // 容器样式
  amapKey: string; // 高德地图key
  center?: Position; // 地图中心点
  zoom?: number; // 地图缩放级别
  mapStyle?: string; // 高德地图styleId
  bbox?: Position[][][] | Position[][] | Position[]; // 限制绘制区域边界
  features?: TurfFeature<TurfPolygon>[] | TurfFeature<TurfMultiPolygon>[];
  selectedIds?: Id[];
  inactiveOnClickEmpty?: boolean; // 是否点击空白处取消选中，默认true
  tools?: Menu[]; // 不设置则显示全部工具
  isContinuousDraw?: boolean; // 绘制完成后是否继续保持绘制模式
  disabledDraw?: boolean; // 是否禁用绘制功能
  nameSetting?: { field: string; style: any }; // polygon名称属性设置，不设置则不显示，field是需要显示的字段名，确保properties里存在，style.eg: { fontSize: 12, fillColor: "#fff" }
  onSelect?: (ids: Id[]) => void;
  onMapReady?: (map: any) => void;
  onChange?: (e: PolygonChange) => void; // 多边形变化回调
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
