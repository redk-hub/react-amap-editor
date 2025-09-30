# React AMap Editor

一个基于高德地图 2.x 的 React 多边形编辑器组件。支持多边形的绘制、编辑、合并、裁切、吸附（摇一摇）等工作流，内置撤销/重做与导入/导出，适合行政区、业务面数据等场景的可视化编辑。

## 功能特性

- ✨ 多边形绘制：依次点击地图添加顶点，双击结束生成面
- 📝 编辑模式：支持选择单个多边形后拖拽编辑顶点
- ✂️ 裁切模式：对选中的单个多边形绘制裁切线，双击结束裁切
- 🔄 合并功能：Shift+点击多选后，合并多个多边形
- 🎯 吸附（摇一摇）：将选中多边形的边/顶点吸附到周边要素（10px 临界值）
- ↩️ 撤销/重做：保留操作历史，支持撤销与重做
- 📥 数据导入：导入 GeoJSON（Polygon/MultiPolygon 自动归一为 MultiPolygon）
- 📤 数据导出：导出当前或选中要素为 GeoJSON FeatureCollection
- 🗑️ 删除功能：删除选中多边形
- 🔍 多选：支持 Shift + 点击进行多选
- 🧱 范围裁切：传入 `bbox` 后，绘制/编辑结果自动裁切到范围内

## 安装

```bash
npm install react-amap-editor
# or
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

### AMapEditor Props

| 属性名                 | 类型                                           | 必填 | 默认值                     | 描述                                                  |
| ---------------------- | ---------------------------------------------- | ---- | -------------------------- | ----------------------------------------------------- |
| `amapKey`              | `string`                                       | 是   | -                          | 高德地图 JSAPI Key（2.x）                             |
| `className`            | `string`                                       | 否   | -                          | 外层容器类名                                          |
| `style`                | `React.CSSProperties`                          | 否   | -                          | 外层容器样式（建议指定宽高）                          |
| `center`               | `Position`                                     | 否   | `[113.700141, 34.826034]`  | 地图初始中心，经纬度 `[lng, lat]`                     |
| `zoom`                 | `number`                                       | 否   | `12`                       | 初始缩放级别                                          |
| `mapStyle`             | `string`                                       | 否   | `amap://styles/whitesmoke` | 地图样式 ID                                           |
| `bbox`                 | `Position[][][] \| Position[][] \| Position[]` | 否   | -                          | 限制操作范围的多边形，绘制/编辑结果将被裁切到该范围内 |
| `features`             | `Polygon[]`                                    | 否   | -                          | 初始要素集合（GeoJSON MultiPolygon，`id` 为 string）  |
| `selectedIds`          | `Id[]`                                         | 否   | -                          | 受控选中项 ID 列表，配合 `onSelect` 使用              |
| `inactiveOnClickEmpty` | `boolean`                                      | 否   | `true`                     | 点击空白处是否取消选中（`false` 表示不取消）          |
| `tools`                | `Menu[]`                                       | 否   | -                          | 控制工具栏显示的按钮，缺省显示全部；可选值见下文      |
| `onSelect`             | `(ids: Id[]) => void`                          | 否   | -                          | 选中项变化时触发（受控模式）                          |
| `onMapReady`           | `(map: any) => void`                           | 否   | -                          | AMap 实例创建完成回调                                 |

类型补充：

- `Id` 为 `string`
- `Polygon` 为 `Feature<MultiPolygon>`，`Feature` 的 `id` 为 `string`
- `Menu` 可选值：`"draw" | "edit" | "clip" | "merge" | "shake" | "delete" | "undo" | "redo" | "import" | "export"`
- `ToolMode`：`"browse" | "draw" | "clip" | "merge" | "edit"`

### ref 方法

通过 React `ref` 可访问历史记录能力（用于外部持久化等）：

```ts
interface AMapEditorRef {
  history: {
    getCurrentState: () => { operate: string; feature: Polygon }[];
    initial: (features: Polygon[], clear: boolean) => void;
    clear: () => void;
  };
}
```

- `history.getCurrentState()`：返回未持久化的变更集（新增/更新/删除）
- `history.initial(features, clear)`：初始化历史与画布要素
- `history.clear()`：清空历史

使用示例：

```tsx
const editorRef = useRef<AMapEditorRef>(null);

// 获取未保存修改
const changes = editorRef.current?.history.getCurrentState();

// 初始化
editorRef.current?.history.initial(features, true);

// 清空历史
editorRef.current?.history.clear();
```

### 工具栏与功能

- **绘制（draw）**：依次点击添加顶点，双击完成；受 `bbox` 约束自动裁切
- **编辑（edit）**：选中单个面后进入编辑
- **裁切（clip）**：选中单个面，绘制裁切线，双击结束开始裁切
- **合并（merge）**：Shift 多选后合并，内部使用 `@turf/turf.union` 并清理冗余坐标
- **摇一摇（shake）**：将选中面的边/点吸附至周边面，使用 10px 阈值
- **删除（delete）**：删除选中面
- **撤销/重做（undo/redo）**：历史回退/前进
- **导入（import）**：支持 `FeatureCollection`/`Feature`/`Feature[]`，`Polygon` 自动归一为 `MultiPolygon`
- **导出（export）**：导出当前或选中要素为 `FeatureCollection`

通过 `tools` 控制显示：

```jsx
<AMapEditor
  tools={["draw", "edit", "merge", "undo", "redo", "import", "export"]}
/>
```

### 键盘与鼠标交互

- `Shift + 点击`：多选/取消选中
- `双击`：结束绘制或结束裁切
- `右键单击`：结束绘制/裁切（在相关模式下）

### 数据导入/导出

- 导入：接受 `.geojson/.json`；`Polygon` 将被包装为 `MultiPolygon`，不合法或空数据会提示
- 导出：当存在选中项时仅导出选中项，否则导出全部；文件名形如 `polygons-<timestamp>.geojson`

### 样式与打包

- 组件样式文件位于 `dist/index.css` 并作为 `style` 字段导出，打包工具可自动引入；也可手动：

```js
import "react-amap-editor/dist/index.css";
```

## 示例（最小）

```jsx
import { AMapEditor } from "react-amap-editor";

export default () => (
  <div style={{ width: "100vw", height: "100vh" }}>
    <AMapEditor amapKey="您的高德地图API密钥" />
  </div>
);
```

## 常见问题（FAQ）

- 高德 Key 无效或未配置时，地图不会初始化（控制台会有警告）。
- 输入 `features` 时请确保每个要素的 `id` 是唯一的 `string`。
- 传入 `bbox` 后，绘制/编辑结果会自动裁切，超出范围的部分将被截断。
- 如需受控选中，请同时传入 `selectedIds` 与 `onSelect`。

## 开发与构建

```bash
# 安装依赖
npm install

# 启动开发示例（依赖 vite.config.js）
npm run dev

# 构建库文件（输出到 dist/）
npm run build
```

- 主入口：`src/index.tsx`
- 组件实现：`src/AMapEditor.tsx`
- 示例：`example/`

## License

MIT
