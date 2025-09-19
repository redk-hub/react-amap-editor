# React AMap Editor

一个基于高德地图的 React 多边形编辑器组件。支持多边形的绘制、编辑、合并、裁切等功能。

## 功能特性

- ✨ 多边形绘制：支持点击地图添加顶点，双击结束绘制
- 📝 编辑功能：可拖拽顶点编辑多边形形状
- 🔄 合并功能：支持多个多边形的合并操作
- ✂️ 裁切功能：支持使用线条裁切多边形
- 🎯 顶点吸附：绘制和编辑时支持顶点吸附功能
- ↩️ 撤销重做：支持操作的撤销和重做
- 📥 数据导入：支持导入 GeoJSON 格式的多边形数据
- 🗑️ 删除功能：支持删除选中的多边形
- 🔍 多选功能：支持 Shift+点击进行多选操作

## 安装

```bash
npm install react-amap-editor
# or
yarn add react-amap-editor
```

## 使用方法

```jsx
import { AMapEditor } from "react-amap-editor";

function App() {
  return (
    <AMapEditor
      amapKey="您的高德地图API密钥"
      style={{ width: "100%", height: "100vh" }}
      onDrawEnd={(feature) => {
        console.log("绘制完成:", feature);
      }}
      onSelect={(feature) => {
        console.log("选中:", feature);
      }}
      onDelete={(feature, allFeatures) => {
        console.log("删除:", feature, "剩余:", allFeatures);
      }}
    />
  );
}
```

## API 参考

### AMapEditor Props

| 属性名    | 类型                                       | 必填 | 描述              |
| --------- | ------------------------------------------ | ---- | ----------------- |
| amapKey   | string                                     | 是   | 高德地图 API 密钥 |
| className | string                                     | 否   | 容器类名          |
| style     | React.CSSProperties                        | 否   | 容器样式          |
| onDrawEnd | (feature: any) => void                     | 否   | 绘制完成回调      |
| onSelect  | (feature: any) => void                     | 否   | 选中要素回调      |
| onDelete  | (feature: any, allFeatures: any[]) => void | 否   | 删除要素回调      |

### 组件方法

通过 React ref 可以调用以下方法：

```tsx
interface AMapEditorRef {
  // 获取所有未保存的修改记录
  getUnSavedFeatures: () => {
    operate: string; // 操作类型：'add' | 'update' | 'delete'
    feature: Polygon; // 要素数据
  }[];
  // 初始化编辑器状态
  initial: (features: Polygon[], clear: boolean) => void;
  // 清除历史记录和缓存
  clearHistory: () => void;
}

// 使用示例
const editorRef = useRef<AMapEditorRef>(null);

// 获取未保存的修改
const unSaved = editorRef.current?.getUnSavedFeatures();

// 初始化编辑器
editorRef.current?.initial(features, true);

// 清除历史记录
editorRef.current?.clearHistory();
```

### 工具栏功能

- **绘制工具**：点击开启绘制模式，点击地图添加顶点，双击结束绘制
- **撤销/重做**：支持对操作进行撤销和重做
- **合并**：选中多个多边形(Shift+点击)后可进行合并
- **裁切**：选中单个多边形后可进行裁切操作
- **删除**：删除选中的多边形
- **导入**：支持导入 GeoJSON 格式的多边形数据

### 键盘快捷操作

- `Shift + 点击`：多选多边形
- `双击`：结束绘制
- `右键单击`：结束绘制/裁切

## 示例

```jsx
import { AMapEditor } from "react-amap-editor";

const App = () => {
  const [log, setLog] = useState("");

  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <AMapEditor
        amapKey="您的高德地图API密钥"
        style={{ width: "100%", height: "100%" }}
        onDrawEnd={(f) =>
          setLog("绘制完成: " + JSON.stringify(f.toGeoJSON?.()))
        }
        onSelect={(f) => setLog("选中: " + JSON.stringify(f.toGeoJSON?.()))}
        onDelete={(f, all) =>
          setLog(
            "删除: " + JSON.stringify(f.toGeoJSON?.()) + " 剩余: " + all.length
          )
        }
      />
    </div>
  );
};
```

## 开发构建

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建库文件
npm run build
```

## License

MIT
