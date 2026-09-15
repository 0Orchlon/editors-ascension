import { describe, expect, it } from 'vitest';
import { validateGameState, validateActionPayload } from '../../../shared/validate/index.ts';
import { newGame } from '../../../shared/save/serialize.ts';

describe('server imports the shared validator (T-04)', () => {
  it('shares one validator with the client', () => {
    expect(validateGameState(newGame())).toEqual([]);
    expect(validateGameState({ ...newGame(), stamina: -1 }).map((i) => i.field)).toContain(
      '/stamina',
    );
  });

  it('validates action payloads by type', () => {
    expect(validateActionPayload('rest', {})).toEqual([]);
    expect(validateActionPayload('claimQuest', { questId: 'q', checkedConditions: [0] })).toEqual(
      [],
    );
    expect(validateActionPayload('claimQuest', { questId: 'q' }).length).toBeGreaterThan(0);
  });
});
