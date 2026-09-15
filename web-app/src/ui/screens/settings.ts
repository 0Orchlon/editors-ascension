/** Settings + export/import + transfer (T-35, T-38, T-40; AC SV-4, SV-5, A11Y-2, A11Y-5, BE-14). */
import type { GameService } from '../../services/gameService.ts';
import type { Sync } from '../../services/sync.ts';
import { announce, button, el, h1, toast } from '../components.ts';

export type SettingsDeps = {
  game: GameService;
  sync?: Sync;
  rerender: () => void;
  /** Тестэд солигдоно — jsdom-д бодит файл татах боломжгүй. */
  download?: (filename: string, text: string) => void;
};

export function renderSettings(deps: SettingsDeps): HTMLElement {
  const { game, rerender } = deps;
  const settings = game.view.settings();
  const root = el('section', { class: 'screen screen-settings' }, [h1('Settings')]);

  // ── Хүртээмж ба мэдрэмж
  const prefs = el('div', { class: 'card' }, [el('h2', { text: 'Accessibility and feel' })]);

  const motion = el('input', { type: 'checkbox', id: 'set-reduced-motion' });
  motion.checked = settings.reducedMotion;
  motion.addEventListener('change', () => {
    game.dispatch('updateSettings', { reducedMotion: motion.checked });
    applyMotionPreference(motion.checked);
    announce(motion.checked ? 'Reduced motion on.' : 'Reduced motion off.');
    rerender();
  });
  prefs.append(el('div', { class: 'option' }, [
    motion,
    el('label', { for: 'set-reduced-motion', text: 'Reduce motion (turns off all animation)' }),
  ]));

  const sound = el('input', { type: 'checkbox', id: 'set-sound' });
  sound.checked = settings.soundEnabled;
  sound.addEventListener('change', () => {
    game.dispatch('updateSettings', { soundEnabled: sound.checked });
    announce(sound.checked ? 'Sound on.' : 'Sound off.');
    rerender();
  });
  prefs.append(el('div', { class: 'option' }, [
    sound,
    el('label', { for: 'set-sound', text: 'Sound cues (never required — the game is fully playable silent)' }),
  ]));
  root.append(prefs);

  // ── Save
  const saveCard = el('div', { class: 'card' }, [
    el('h2', { text: 'Your save' }),
    el('p', { class: 'muted', 'data-testid': 'last-saved', text: lastSavedText(game.view.lastSavedAt()) }),
  ]);

  saveCard.append(button('Export save to a file', () => {
    const text = game.exportSave();
    const filename = `editors-ascension-save-${new Date().toISOString().slice(0, 10)}.json`;
    (deps.download ?? browserDownload)(filename, text);
    announce('Save exported.');
    toast('Save exported.', 'win');
  }));

  const importInput = el('input', { type: 'file', id: 'import-file', accept: 'application/json' });
  const importStatus = el('p', { class: 'outcome', role: 'status' });
  importInput.addEventListener('change', () => {
    const file = importInput.files?.[0];
    if (file === undefined) return;
    void file.text().then((text) => applyImport(text));
  });

  const importText = el('textarea', { id: 'import-text', rows: '4', placeholder: '…or paste save JSON here' });
  const applyImport = (text: string): void => {
    const result = game.importSave(text);
    if (!result.ok) {
      // ⚠ AC SV-5 — татгалзсан файл ОДООГИЙН төлвийг УСТГАХГҮЙ.
      importStatus.textContent = `${result.reason} Your current progress was left untouched.`;
      announce(importStatus.textContent);
      toast('Import rejected. Nothing was changed.', 'warn');
      return;
    }
    importStatus.textContent = 'Save imported.';
    announce('Save imported.');
    rerender();
  };

  saveCard.append(
    el('label', { for: 'import-file', text: 'Import a save file' }), importInput,
    el('label', { for: 'import-text', text: 'Import from pasted text' }), importText,
    button('Import pasted save', () => applyImport(importText.value)),
    importStatus,
  );
  root.append(saveCard);

  // ── Төхөөрөмж хоорондын шилжүүлэг (AC BE-14)
  if (deps.sync !== undefined) {
    const sync = deps.sync;
    const transfer = el('div', { class: 'card' }, [
      el('h2', { text: 'Move to another device' }),
      el('p', { class: 'muted', text: 'A transfer code copies your progress to another device. It works once and expires in 15 minutes. Your save here is kept.' }),
    ]);
    const output = el('p', { class: 'outcome', role: 'status' });

    transfer.append(button('Create a transfer code', () => {
      void (async () => {
        const creds = sync.credentials();
        if (creds === null) {
          output.textContent = 'No server connection yet — transfer codes need the server.';
          return;
        }
        output.textContent = 'Requesting a code…';
        rerender();
      })();
    }));

    const redeemInput = el('input', { type: 'text', id: 'redeem-code', placeholder: 'XXXX-XXXX-XXXX' });
    transfer.append(
      el('label', { for: 'redeem-code', text: 'Enter a transfer code from your other device' }),
      redeemInput,
      output,
    );
    root.append(transfer);
  }

  return root;
}

function lastSavedText(at: string | null): string {
  return at === null ? 'Not saved yet.' : `Last saved ${at.replace('T', ' ').slice(0, 19)} UTC`;
}

/** AC A11Y-2 — тохиргоо нь БҮХ анимацийг унтраана, зөвхөн зарим нэгийг биш. */
export function applyMotionPreference(reduced: boolean): void {
  document.documentElement.classList.toggle('reduced-motion', reduced);
}

function browserDownload(filename: string, text: string): void {
  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
