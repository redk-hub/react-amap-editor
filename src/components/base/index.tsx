import React from "react";
import "../styles/index.css";

type ButtonProps = {
  type?: "primary" | "default" | "danger";
  size?: "small" | "middle";
  disabled?: boolean;
  icon?: React.ReactNode;
  onClick?: () => void;
  children?: React.ReactNode;
};

export const Button: React.FC<ButtonProps> = ({
  type = "default",
  size = "middle",
  disabled,
  icon,
  onClick,
  children,
}) => {
  const classes = [
    "btn",
    type !== "default" && `btn-${type}`,
    size === "small" && "btn-small",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button className={classes} disabled={disabled} onClick={onClick}>
      {icon && (
        <span style={{ marginRight: children ? "8px" : 0 }}>{icon}</span>
      )}
      {children}
    </button>
  );
};

type TooltipProps = {
  title: React.ReactNode;
  children: React.ReactNode;
};

export const Tooltip: React.FC<TooltipProps> = ({ title, children }) => {
  return (
    <div className="tooltip">
      {children}
      <div className="tooltip-content">{title}</div>
    </div>
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

type FormProps = {
  children: React.ReactNode;
  onSubmit?: (e: React.FormEvent) => void;
};

export const Form: React.FC<FormProps> = ({ children, onSubmit }) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit?.(e);
  };

  return (
    <form className="form" onSubmit={handleSubmit}>
      {children}
    </form>
  );
};

type FormItemProps = {
  label?: string;
  children: React.ReactNode;
};

export const FormItem: React.FC<FormItemProps> = ({ label, children }) => {
  return (
    <div className="form-item">
      {label && <label>{label}</label>}
      {children}
    </div>
  );
};

type InputProps = {
  value?: string;
  placeholder?: string;
  onChange?: (value: string) => void;
};

export const Input: React.FC<InputProps> = ({
  value,
  placeholder,
  onChange,
}) => {
  return (
    <input
      className="form-input"
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange?.(e.target.value)}
    />
  );
};

type DrawerProps = {
  open?: boolean;
  title?: string;
  onClose?: () => void;
  children: React.ReactNode;
  extra?: React.ReactNode;
};

export const Drawer: React.FC<DrawerProps> = ({
  open,
  title,
  onClose,
  children,
  extra,
}) => {
  return (
    <div className={`drawer${open ? " open" : ""}`}>
      <div className="drawer-header">
        <h3 className="drawer-title">{title}</h3>
        {extra}
      </div>
      <div className="drawer-body">{children}</div>
    </div>
  );
};

type DescriptionsProps = {
  children: React.ReactNode;
};

export const Descriptions: React.FC<DescriptionsProps> = ({ children }) => {
  return <div className="descriptions">{children}</div>;
};

type DescriptionsItemProps = {
  label: React.ReactNode;
  children: React.ReactNode;
};

export const DescriptionsItem: React.FC<DescriptionsItemProps> = ({
  label,
  children,
}) => {
  return (
    <div className="descriptions-row">
      <div className="descriptions-label">{label}</div>
      <div className="descriptions-content">{children}</div>
    </div>
  );
};
