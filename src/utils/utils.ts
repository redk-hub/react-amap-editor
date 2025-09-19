export function deepClone(obj: any) {
  // 判断如果不是引用类型，直接返回数据即可
  if (
    typeof obj === "string" ||
    typeof obj === "number" ||
    typeof obj === "boolean" ||
    typeof obj === "undefined"
  ) {
    return obj;
  } else {
    const objClone: any = Array.isArray(obj) ? [] : {};
    if (obj && typeof obj === "object") {
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          if (obj[key] && typeof obj[key] === "object") {
            objClone[key] = deepClone(obj[key]);
          } else {
            objClone[key] = obj[key];
          }
        }
      }
    }
    return objClone;
  }
}

export const uuid = () => {
  return String(Date.now()) + Math.random().toString(36).slice(2);
};
