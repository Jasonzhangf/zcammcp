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
