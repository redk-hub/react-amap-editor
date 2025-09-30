// src/components/Toolbar/index.tsx
import React from "react";
import { Button, Space, Tooltip } from "@/components/base";
import {
  ScissorIcon,
  EditIcon,
  EditModeIcon,
  UndoIcon,
  RedoIcon,
  MergeIcon,
  DeleteIcon,
  ShakeIcon,
} from "@/components/icons";
import type { Menu, ToolMode } from "@/types";

type Props = {
  mode: ToolMode;
  tools?: Menu[];
  onModeChange: (m: ToolMode) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  disabledUndo?: boolean;
  disabledRedo?: boolean;
  onMerge?: () => void;
  disabledMerge?: boolean;
  onClip?: () => void;
  disabledClip?: boolean;
  onDelete?: () => void;
  disabledDelete?: boolean;
  onShake?: () => void;
  disabledShake?: boolean;
  onEdit?: () => void;
  disabledEdit?: boolean;
};

const IconBtn: React.FC<React.ComponentProps<typeof Button>> = (p) => (
  <Button size="small" {...p} />
);

const Toolbar: React.FC<Props> = ({
  mode,
  tools,
  onModeChange,
  onUndo,
  onRedo,
  disabledUndo,
  disabledRedo,
  onMerge,
  disabledMerge,
  onClip,
  disabledClip,
  onDelete,
  disabledDelete,
  onShake,
  disabledShake,
  onEdit,
  disabledEdit,
}) => {
  return (
    <Space wrap>
      <Tooltip
        visible={!tools || tools?.includes("draw")}
        title={
          <span>
            绘制多边形：依次点击地图添加顶点，支持吸附；
            <br />
            双击结束并生成多边形。
          </span>
        }
      >
        <IconBtn
          type={mode === "draw" ? "primary" : "default"}
          icon={<EditIcon />}
          onClick={() => onModeChange(mode === "draw" ? "browse" : "draw")}
        />
      </Tooltip>

      <Tooltip
        visible={!tools || tools?.includes("edit")}
        title="编辑模式：点击进入编辑模式，可以修改已绘制的多边形"
      >
        <IconBtn
          type={mode === "edit" ? "primary" : "default"}
          icon={<EditModeIcon />}
          onClick={() => onModeChange(mode === "edit" ? "browse" : "edit")}
          disabled={disabledEdit}
        />
      </Tooltip>

      <Tooltip
        visible={!tools || tools?.includes("undo")}
        title="撤销：回到上一步操作"
      >
        <IconBtn icon={<UndoIcon />} onClick={onUndo} disabled={disabledUndo} />
      </Tooltip>
      <Tooltip
        visible={!tools || tools?.includes("redo")}
        title="重做：恢复被撤销的操作"
      >
        <IconBtn icon={<RedoIcon />} onClick={onRedo} disabled={disabledRedo} />
      </Tooltip>

      <Tooltip
        visible={!tools || tools?.includes("merge")}
        title="合并：shift+鼠标左键单击选中多个要素合并"
      >
        <IconBtn
          icon={<MergeIcon />}
          onClick={onMerge}
          disabled={disabledMerge}
        />
      </Tooltip>
      <Tooltip
        visible={!tools || tools?.includes("clip")}
        title="裁切：选中要素，绘制裁切线，双击结束开始裁切"
      >
        <IconBtn
          icon={<ScissorIcon />}
          onClick={onClip}
          disabled={disabledClip}
        />
      </Tooltip>

      <Tooltip
        visible={!tools || tools?.includes("shake")}
        title="摇一摇：选中多边形自动吸附到周边多边形的边或顶点（10px临界值）"
      >
        <IconBtn
          icon={<ShakeIcon />}
          onClick={onShake}
          disabled={disabledShake}
        />
      </Tooltip>

      <Tooltip
        visible={!tools || tools?.includes("delete")}
        title="选中要素，点击删除"
      >
        <IconBtn
          icon={<DeleteIcon />}
          onClick={onDelete}
          disabled={disabledDelete}
        />
      </Tooltip>
    </Space>
  );
};

export default Toolbar;
