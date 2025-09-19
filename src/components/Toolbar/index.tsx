// src/components/Toolbar/index.tsx
import React from "react";
import { Button, Space, Tooltip } from "@/components/base";
import {
  ScissorIcon,
  EditIcon,
  UndoIcon,
  RedoIcon,
  MergeIcon,
  DeleteIcon,
} from "@/components/icons";
import type { ToolMode } from "@/types";

type Props = {
  mode: ToolMode;
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
};

const IconBtn: React.FC<React.ComponentProps<typeof Button>> = (p) => (
  <Button size="small" {...p} />
);

const Toolbar: React.FC<Props> = ({
  mode,
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
}) => {
  return (
    <Space wrap>
      <Tooltip
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

      <Tooltip title="撤销：回到上一步操作">
        <IconBtn icon={<UndoIcon />} onClick={onUndo} disabled={disabledUndo} />
      </Tooltip>
      <Tooltip title="重做：恢复被撤销的操作">
        <IconBtn icon={<RedoIcon />} onClick={onRedo} disabled={disabledRedo} />
      </Tooltip>

      <Tooltip title="合并：shift+鼠标左键单击选中多个要素合并">
        <IconBtn
          icon={<MergeIcon />}
          onClick={onMerge}
          disabled={disabledMerge}
        />
      </Tooltip>
      <Tooltip title="裁切：选中要素，绘制裁切线，双击结束开始裁切">
        <IconBtn
          icon={<ScissorIcon />}
          onClick={onClip}
          disabled={disabledClip}
        />
      </Tooltip>

      <Tooltip title="选中要素，点击删除">
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
