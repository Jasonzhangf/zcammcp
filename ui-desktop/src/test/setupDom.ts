import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><html><body></body></html>', {
  url: 'https://zcammcp.local/',
});
const globalAny = globalThis as any;

Object.defineProperty(globalAny, 'window', {
  value: dom.window,
  configurable: true,
});
Object.defineProperty(globalAny, 'document', {
  value: dom.window.document,
  configurable: true,
});
Object.defineProperty(globalAny, 'navigator', {
  value: dom.window.navigator,
  configurable: true,
});

Object.getOwnPropertyNames(dom.window).forEach((property) => {
  if (property in globalAny) {
    return;
  }
  globalAny[property] = (dom.window as any)[property];
});

if (typeof globalAny.requestAnimationFrame !== 'function') {
  globalAny.requestAnimationFrame = (callback: (time: number) => void) => {
    return setTimeout(() => callback(Date.now()), 0) as unknown as number;
  };
}

if (typeof globalAny.cancelAnimationFrame !== 'function') {
  globalAny.cancelAnimationFrame = (id: number) => {
    clearTimeout(id);
  };
}
