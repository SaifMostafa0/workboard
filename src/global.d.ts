// Global type declarations for missing globals in node_modules
// This file provides type declarations for missing globals in node_modules
// Playwright-core types require these globals

// DOM types that playwright-core expects
interface Node extends EventTarget {
  readonly nodeType: number;
  readonly nodeName: string;
  readonly parentNode: Node | null;
  readonly childNodes: NodeList;
  readonly firstChild: Node | null;
  readonly lastChild: Node | null;
  readonly previousSibling: Node | null;
  readonly nextSibling: Node | null;
  readonly ownerDocument: Document | null;
  readonly textContent: string | null;
  appendChild(node: Node): Node;
  removeChild(node: Node): Node;
  insertBefore(newNode: Node, referenceNode: Node | null): Node;
  replaceChild(newChild: Node, oldChild: Node): Node;
}

interface HTMLElementTagNameMap {
  [key: string]: HTMLElement;
  a: HTMLAnchorElement;
  div: HTMLDivElement;
  span: HTMLSpanElement;
  button: HTMLButtonElement;
  input: HTMLInputElement;
  form: HTMLFormElement;
  img: HTMLImageElement;
  ul: HTMLUListElement;
  li: HTMLLIElement;
  ol: HTMLOListElement;
  table: HTMLTableElement;
  tr: HTMLTableRowElement;
  td: HTMLTableCellElement;
  th: HTMLTableCellElement;
  p: HTMLParagraphElement;
  h1: HTMLHeadingElement;
  h2: HTMLHeadingElement;
  h3: HTMLHeadingElement;
  h4: HTMLHeadingElement;
  h5: HTMLHeadingElement;
  h6: HTMLHeadingElement;
  label: HTMLLabelElement;
  select: HTMLSelectElement;
  option: HTMLOptionElement;
  textarea: HTMLTextAreaElement;
  script: HTMLScriptElement;
  style: HTMLStyleElement;
  link: HTMLLinkElement;
  meta: HTMLMetaElement;
  head: HTMLHeadElement;
  body: HTMLBodyElement;
  html: HTMLHtmlElement;
}

interface SVGElement extends Element {
  readonly ownerSVGElement: SVGSVGElement | null;
  readonly viewportElement: SVGElement | null;
}

interface HTMLElement extends Element {
  readonly accessKey: string;
  readonly dataset: DOMStringMap;
  readonly innerText: string;
  readonly outerText: string;
  click(): void;
  focus(): void;
  blur(): void;
}

interface Worker extends EventTarget {
  postMessage(message: any, transfer: Transferable[]): void;
  postMessage(message: any, options?: StructuredSerializeOptions): void;
  terminate(): void;
  onmessage: ((this: Worker, ev: MessageEvent) => any) | null;
  onerror: ((this: Worker, ev: ErrorEvent) => any) | null;
  onmessageerror: ((this: Worker, ev: MessageEvent) => any) | null;
}

interface SVGSVGElement extends SVGElement {
  readonly width: SVGAnimatedLength;
  readonly height: SVGAnimatedLength;
  readonly viewBox: SVGAnimatedRect;
  createSVGRect(): SVGRect;
  createSVGPoint(): SVGPoint;
}

// Vite types
interface ImportMetaEnv {
  readonly VITE_APP_TITLE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

export {};
