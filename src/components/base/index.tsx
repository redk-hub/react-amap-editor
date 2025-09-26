import React from "react";

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
