import React from "react";
import { useEffect } from "react";
import ReactDOM from "react-dom";

type ButtonProps = {
  type?: "primary" | "default" | "danger";
  size?: "small" | "middle";
  disabled?: boolean;
  icon?: React.ReactNode;
  onClick?: () => void;
  children?: React.ReactNode;
  style?: React.CSSProperties;
};

export const Button: React.FC<ButtonProps> = ({
  type = "default",
  size = "middle",
  disabled,
  icon,
  onClick,
  children,
  style,
}) => {
  const classes = [
    "btn",
    type !== "default" && `btn-${type}`,
    size === "small" && "btn-small",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      className={classes}
      disabled={disabled}
      onClick={onClick}
      style={style}
    >
      {icon && (
        <span style={{ marginRight: children ? "8px" : 0 }}>{icon}</span>
      )}
      {children}
    </button>
  );
};

type TooltipProps = {
  visible?: boolean;
  title: React.ReactNode;
  children: React.ReactNode;
};

export const Tooltip: React.FC<TooltipProps> = ({
  title,
  children,
  visible = true,
}) => {
  return (
    !!visible && (
      <div className="tooltip">
        {children}
        <div className="tooltip-content">{title}</div>
      </div>
    )
  );
};

type SpaceProps = {
  children: React.ReactNode;
  wrap?: boolean;
};

export const Space: React.FC<SpaceProps> = ({ children, wrap }) => {
  return <div className={`space${wrap ? " wrap" : ""}`}>{children}</div>;
};

type UploadProps = {
  accept?: string;
  beforeUpload?: (file: File) => boolean | Promise<boolean>;
  children: React.ReactNode;
};

export const Upload: React.FC<UploadProps> = ({
  accept,
  beforeUpload,
  children,
}) => {
  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (beforeUpload) {
      const result = await beforeUpload(file);
      if (!result) {
        e.target.value = "";
        return;
      }
    }
  };

  return (
    <label className="upload-trigger">
      {children}
      <input
        type="file"
        className="upload-input"
        accept={accept}
        onChange={handleChange}
      />
    </label>
  );
};

// ModalDialog 组件
type ModalDialogProps = {
  visible: boolean;
  title?: React.ReactNode;
  content?: React.ReactNode;
  okText?: string;
  cancelText?: string;
  onOk?: () => void;
  onCancel?: () => void;
};

const ModalDialog: React.FC<ModalDialogProps> = ({
  visible,
  title,
  content,
  okText = "确定",
  cancelText = "取消",
  onOk,
  onCancel,
}) => {
  if (!visible) return null;
  return ReactDOM.createPortal(
    <div className="modal-mask">
      <div className="modal-wrap">
        <div className="modal-header">{title}</div>
        <div className="modal-content">{content}</div>
        <div className="modal-footer">
          <Button onClick={onCancel}>{cancelText}</Button>
          <Button type="primary" onClick={onOk} style={{ marginLeft: 8 }}>
            {okText}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
};

// Modal.confirm 静态方法
const ModalConfirm = (options: {
  title?: React.ReactNode;
  content?: React.ReactNode;
  okText?: string;
  cancelText?: string;
  onOk?: () => void;
  onCancel?: () => void;
}): void => {
  const div = document.createElement("div");
  document.body.appendChild(div);

  const destroy = () => {
    ReactDOM.unmountComponentAtNode(div);
    div.parentNode?.removeChild(div);
  };

  const handleOk = () => {
    options.onOk?.();
    destroy();
  };
  const handleCancel = () => {
    options.onCancel?.();
    destroy();
  };

  ReactDOM.render(
    <ModalDialog
      visible={true}
      title={options.title}
      content={options.content}
      okText={options.okText}
      cancelText={options.cancelText}
      onOk={handleOk}
      onCancel={handleCancel}
    />,
    div
  );
};

// Modal.confirm 兼容 antd API
export const Modal = {
  confirm: ModalConfirm,
};
