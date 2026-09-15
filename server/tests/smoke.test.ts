import { describe, it, expect } from 'vitest';
import { startApp } from './helpers.ts';

describe('server bootstrap (T-02, T-24)', () => {
  it('starts, answers health, and stops', async () => {
    const app = await startApp();
    const res = await app.request('GET', '/api/health');
    expect(res.status).toBe(200);
    await app.close();
  });
});
