/// <reference types="vite/client" />
/// <reference types="@react-router/dev/vite" />

declare module "*.css" {
  const content: string;
  export default content;
}
