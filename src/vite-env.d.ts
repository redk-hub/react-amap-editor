/// <reference types="vite/client" />
/// <reference types="@amap/amap-jsapi-types" />

declare module "*.less" {
  const classes: { readonly [key: string]: string };
  export default classes;
}
