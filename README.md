# React AMap Editor

基于高德地图 2.x 的 React 多边形编辑器组件，支持多边形的绘制、编辑、合并、裁切、吸附（摇一摇）、撤销/重做、导入/导出等完整工作流，适合行政区、业务面数据等场景的可视化编辑。

## 主要功能

- 多边形绘制：点击地图添加顶点，双击或右键结束生成面，支持吸附到已有要素
- 编辑模式：选中单个多边形后拖拽编辑顶点，自动裁切到边界
- 裁切模式：对选中多边形绘制裁切线，双击或右键结束裁切
- 合并功能：Shift+点击多选后合并多个多边形，自动清理冗余坐标
- 吸附（摇一摇）：选中多边形边/顶点吸附到周边要素（20px 临界值，动画提示）
- 撤销/重做：完整操作历史，支持撤销与重做
- 数据导入：支持 GeoJSON（Polygon/MultiPolygon 自动归一为 MultiPolygon），批量导入性能优化
- 数据导出：导出当前或选中要素为 GeoJSON FeatureCollection
- 删除功能：删除选中多边形
- 多选：Shift+点击进行多选/取消选中
- 范围裁切：传入 `bbox` 后，绘制/编辑结果自动裁切到范围内
- 多边形名称显示：可配置显示属性字段及样式
- 受控/非受控选中：支持外部受控选中与回调
- 事件回调：支持 onChange、onSelect、onMapReady 等多种事件

## 安装

```bash
npm install react-amap-editor
# 或
yarn add react-amap-editor
```

## 快速上手

```jsx
import { AMapEditor } from "react-amap-editor";

function App() {
  return (
    <AMapEditor
      amapKey="您的高德地图API密钥"
      style={{ width: "100%", height: "100vh" }}
    />
  );
}
```

## 组件用法示例

```jsx
import { useRef, useState } from "react";
import { AMapEditor } from "react-amap-editor";

const Demo = () => {
  const [log, setLog] = useState("");
  const editorRef = useRef(null);

  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <AMapEditor
        ref={editorRef}
        amapKey="您的高德地图API密钥"
        style={{ width: "100%", height: "100%" }}
        center={[116.397428, 39.90923]}
        zoom={12}
        mapStyle="amap://styles/whitesmoke"
        bbox={[
          [
            [116.716203, 40.079011],
            [116.716203, 39.741667],
            [116.078653, 39.741667],
            [116.078653, 40.079011],
            [116.716203, 40.079011],
          ],
        ]}
        features={[]}
        onSelect={(ids) => setLog("选中: " + JSON.stringify(ids))}
        onMapReady={(map) => console.log("AMap 初始化完成", map)}
      />
      <div style={{ position: "absolute", right: 12, bottom: 12 }}>{log}</div>
    </div>
  );
};
```

## API 参考

### Props

| 属性名                 | 类型                            | 必填         | 默认值                     | 描述                                                 |
| ---------------------- | ------------------------------- | ------------ | -------------------------- | ---------------------------------------------------- | --- | ----------------------------------------------------- |
| `amapKey`              | `string`                        | 是           | -                          | 高德地图 JSAPI Key（2.x）                            |
| `className`            | `string`                        | 否           | -                          | 外层容器类名                                         |
| `style`                | `React.CSSProperties`           | 否           | -                          | 外层容器样式（建议指定宽高）                         |
| `center`               | `Position`                      | 否           | `[113.700141, 34.826034]`  | 地图初始中心，经纬度 `[lng, lat]`                    |
| `zoom`                 | `number`                        | 否           | `12`                       | 初始缩放级别                                         |
| `mapStyle`             | `string`                        | 否           | `amap://styles/whitesmoke` | 地图样式 ID                                          |
| `bbox`                 | `Position[][][]                 | Position[][] | Position[]`                | 否                                                   | -   | 限制操作范围的多边形，绘制/编辑结果将被裁切到该范围内 |
| `features`             | `Polygon[]`                     | 否           | -                          | 初始要素集合（GeoJSON MultiPolygon，`id` 为 string） |
| `selectedIds`          | `Id[]`                          | 否           | -                          | 受控选中项 ID 列表，配合 `onSelect` 使用             |
| `inactiveOnClickEmpty` | `boolean`                       | 否           | `true`                     | 点击空白处是否取消选中                               |
| `tools`                | `Menu[]`                        | 否           | -                          | 控制工具栏显示的按钮                                 |
| `isContinuousDraw`     | `boolean`                       | 否           | `true`                     | 绘制完成后是否继续保持绘制模式                       |
| `nameSetting`          | `{ field: string; style: any }` | 否           | -                          | 多边形名称属性及样式                                 |
| `onSelect`             | `(ids: Id[]) => void`           | 否           | -                          | 选中项变化时回调                                     |
| `onMapReady`           | `(map: any) => void`            | 否           | -                          | 地图初始化完成回调                                   |
| `onChange`             | `(e: PolygonChange) => void`    | 否           | -                          | 多边形变化回调                                       |

类型补充：

- `Id` 为 `string`
- `Polygon` 为 `Feature<MultiPolygon>`，`Feature` 的 `id` 为 `string`
- `Menu` 可选值：`"draw" | "edit" | "clip" | "merge" | "shake" | "delete" | "undo" | "redo" | "import" | "export"`
- `ToolMode`：`"browse" | "draw" | "clip" | "merge" | "edit"`

### ref 方法

通过 React `ref` 可访问历史记录能力：

```ts
interface AMapEditorRef {
  history: {
    getCurrentState: () => { operate: string; feature: Polygon }[];
    initial: (features: Polygon[], clear: boolean) => void;
    clear: () => void;
  };
}
```

### 工具栏与功能

- 绘制（draw）：依次点击添加顶点，双击或右键完成，支持吸附
- 编辑（edit）：选中单个面后进入编辑，自动裁切到边界
- 裁切（clip）：选中单个面，绘制裁切线，双击或右键结束裁切
- 合并（merge）：Shift 多选后合并，自动清理冗余坐标
- 摇一摇（shake）：选中面吸附至周边面，动画提示
- 删除（delete）：删除选中面
- 撤销/重做（undo/redo）：历史回退/前进
- 导入（import）：支持多种 GeoJSON 格式，批量导入性能优化
- 导出（export）：导出当前或选中要素为 FeatureCollection

### 键盘与鼠标交互

- Shift + 点击：多选/取消选中
- 双击/右键：结束绘制或裁切

### 数据导入/导出

- 导入：支持 `.geojson/.json`，Polygon 自动归一为 MultiPolygon
- 导出：选中项优先导出，否则导出全部

### 样式与打包

- 样式文件位于 `dist/index.css`，可自动或手动引入

```js
import "react-amap-editor/dist/index.css";
```

## 最小示例

```jsx
import { AMapEditor } from "react-amap-editor";

export default () => (
  <div style={{ width: "100vw", height: "100vh" }}>
    <AMapEditor amapKey="您的高德地图API密钥" />
  </div>
);
```

## 常见问题

- 高德 Key 无效或未配置时，地图不会初始化（控制台有警告）
- `features` 每个要素的 `id` 必须唯一
- 传入 `bbox` 后，绘制/编辑结果自动裁切
- 受控选中需同时传入 `selectedIds` 与 `onSelect`

## 开发与构建

```bash
npm install
npm run dev      # 启动开发示例
npm run build    # 构建库文件
```

- 主入口：`src/index.tsx`
- 组件实现：`src/AMapEditor.tsx`
- 示例：`example/`

## License

MIT
