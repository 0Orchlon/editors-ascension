/**
 * Import-ийн татгалзал (lld.md §7.7; AC SV-5).
 *
 * ⚠ «Rejected (schema)» гэдэг нь тоглогчид ЮУ ч хэлэхгүй — §7.7 нь `issues`-ийн
 * эхний 5 алдааг талбарын замтай нь харуулахыг шаардана.
 */
import { describe, expect, it } from 'vitest';
import { newGame } from '@shared/save/serialize.ts';
import { buildPack } from '@shared/content/index.ts';
import { createGameService } from '../../src/services/gameService.ts';
import { renderSettings } from '../../src/ui/screens/settings.ts';
import { buildShell } from '../../src/ui/shell.ts';

const badSave = JSON.stringify({ schemaVersion: 1, updatedAt: '2026-01-01T00:00:00.000Z', state: { ...newGame(), xp: -5, level: 0 } });

function mountSettings() {
  document.body.innerHTML = '<div id="app"></div>';
  buildShell(document.getElementById('app')!);
  const game = createGameService({ pack: buildPack(), initial: newGame() });
  const root = renderSettings({ game, rerender: () => undefined });
  document.getElementById('main')!.replaceChildren(root);
  return { game, root };
}

describe('import rejection detail (§7.7)', () => {
  it('нэрлэсэн талбар бүрийг харуулна', () => {
    const { root } = mountSettings();
    (root.querySelector('#import-text') as HTMLTextAreaElement).value = badSave;
    [...root.querySelectorAll('button')].find((b) => b.textContent === 'Import pasted save')!.click();

    const outcome = root.querySelector('.outcome')!.textContent!;
    expect(outcome).toContain('/xp');
    expect(outcome).toContain('/level');
  });

  it('татгалзал нь одоогийн төлвийг ХЭВЭЭР үлдээнэ (SV-5)', () => {
    const { game, root } = mountSettings();
    const before = game.state$.getState();
    (root.querySelector('#import-text') as HTMLTextAreaElement).value = badSave;
    [...root.querySelectorAll('button')].find((b) => b.textContent === 'Import pasted save')!.click();
    expect(game.state$.getState()).toEqual(before);
  });

  it('уншигдахгүй текстэд ойлгомжтой шалтгаан харуулна', () => {
    const { root } = mountSettings();
    (root.querySelector('#import-text') as HTMLTextAreaElement).value = '{ not json';
    [...root.querySelectorAll('button')].find((b) => b.textContent === 'Import pasted save')!.click();
    expect(root.querySelector('.outcome')!.textContent).toMatch(/not a save file|could not be read/i);
  });
});
