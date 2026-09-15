import { describe, it, expect } from 'vitest';
import { createServer } from '../src/index.ts';

describe('server bootstrap (T-02)', () => {
  it('starts and stops', async () => {
    const s = createServer();
    const port = await s.listen(0);
    expect(port).toBeGreaterThan(0);
    await s.close();
  });
});
