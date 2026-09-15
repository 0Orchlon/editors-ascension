/** UI тестийн туслах — жинхэнэ DOM дээр бүрхүүлийг угсарна. */
import { boot } from '../../src/app/main.ts';
import type { Storage } from '../../src/services/persistence.ts';

export function memoryStorage(seed: Record<string, string> = {}): Storage & { dump: () => Record<string, string> } {
  const map = new Map(Object.entries(seed));
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
    dump: () => Object.fromEntries(map),
  };
}

/** Сүлжээгүй горим — сервер бүрэн унтарсан гэж үзнэ (AC BE-7). */
export const offlineFetch: typeof fetch = () => Promise.reject(new Error('offline'));

export function mount(seed: Record<string, string> = {}) {
  document.body.innerHTML = '<div id="app"></div>';
  globalThis.fetch = offlineFetch;
  window.location.hash = '#/camp';
  const storage = memoryStorage(seed);
  boot(document.getElementById('app')!, storage);
  return { storage };
}

export const go = (hash: string): void => {
  window.location.hash = hash;
  window.dispatchEvent(new HashChangeEvent('hashchange'));
};

export const $ = <T extends Element = HTMLElement>(sel: string): T | null => document.querySelector<T>(sel);
export const $$ = <T extends Element = HTMLElement>(sel: string): T[] => [...document.querySelectorAll<T>(sel)];
export const text = (): string => document.getElementById('main')?.textContent ?? '';

/** Гарчгаар нь товч олох — тестийг DOM-ийн бүтцээс сулруулна. */
export const buttonByText = (label: string): HTMLButtonElement | undefined =>
  $$<HTMLButtonElement>('button').find((b) => b.textContent?.trim() === label);

/**
 * ⚠ Модал доторх товчийг ЗААВАЛ энэ функцээр ол. `buttonByText` нь баримт бичгийн
 * дарааллаар хайдаг тул модалыг НЭЭСЭН карт дээрх ижил нэртэй товчийг эхэлж олно —
 * тэр нь өөр товч бөгөөд идэвхгүй байдал нь өөр утгатай.
 */
export const modalButtonByText = (label: string): HTMLButtonElement | undefined =>
  $$<HTMLButtonElement>('.modal button').find((b) => b.textContent?.trim() === label);
