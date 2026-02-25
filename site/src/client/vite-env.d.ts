/// <reference types="vite/client" />

declare module "*.md?raw" {
  const content: string;
  export default content;
}

declare module "highlightjs-solidity/dist/solidity.es.min.js" {
  import type { LanguageFn } from "highlight.js";
  const solidity: LanguageFn;
  export default solidity;
}
