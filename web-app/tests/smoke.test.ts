import { describe, it, expect } from 'vitest';
import { mountApp } from '../src/app/main.ts';

describe('web-app bootstrap (T-01)', () => {
  it('mounts into a host element', () => {
    const host = document.createElement('div');
    mountApp(host);
    expect(host.textContent).toContain("Editor's Ascension");
  });
});
