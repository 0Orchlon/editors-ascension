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
      // ⚠ AC SV-5 — татгалзсан файл ОДООГИЙН төлвийг УСТГАХГҮЙ, сервер рүү ч явахгүй.
      // §7.7 — эхний 5 алдааг талбарын замтай нь нэрлэнэ, эс бөгөөс тоглогч
      // файлаа засах ямар ч мэдээлэлгүй үлдэнэ.
      const first = (result.issues ?? []).slice(0, 5);
      importStatus.replaceChildren(
        el('span', { text: `${result.reason} Your current progress was left untouched.` }),
        ...(first.length === 0
          ? []
          : [el('ul', { class: 'issue-list' }, first.map((i) => el('li', { text: `${i.field}: ${i.message}` })))]),
        ...((result.issues?.length ?? 0) > 5
          ? [el('span', { class: 'muted', text: `…and ${result.issues!.length - 5} more.` })]
          : []),
      );
      announce(importStatus.textContent ?? '');
      toast('Import rejected. Nothing was changed.', 'warn');
      return;
    }
    importStatus.replaceChildren(el('span', { text: 'Save imported.' }));
    announce('Save imported.');
    // lld.md §7.7 — импортолсон төлөв нь серверт БҮТНЭЭР тавигдана, эс бөгөөс
    // дараагийн sync нь серверийн хуучин save-ыг буцааж татна.
    void deps.sync?.pushFullSave(game.state$.getState(), new Date().toISOString());
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
    // ⚠ `output` нь `rerender()`-ээр УСТДАГ. Тиймээс энэ хэсэг дахин зурагдахгүй:
    // хариу нь тоглогчийн нүдэн дээр үлдэнэ.
    const output = el('p', { class: 'outcome', role: 'status' });

    transfer.append(button('Create a transfer code', () => {
      output.textContent = 'Requesting a code…';
      void sync.createTransferCode().then((result) => {
        if (result === null) {
          output.textContent = 'Could not reach the server. Try again when you are online.';
          announce(output.textContent);
          return;
        }
        // Код нь НЭГ удаа ажиллана — тоглогч бүтэн байдлаар нь харах ёстой.
        output.textContent = `Your transfer code: ${result.code} — enter it on the other device within 15 minutes.`;
        announce(output.textContent);
      });
    }));

    const redeemInput = el('input', { type: 'text', id: 'redeem-code', placeholder: 'XXXX-XXXX-XXXX' });
    const redeem = (): void => {
      const code = redeemInput.value.trim();
      if (code.length === 0) {
        output.textContent = 'Enter the code from your other device first.';
        return;
      }
      output.textContent = 'Checking the code…';
      void sync.redeemTransferCode(code).then((ok) => {
        // ⚠ Олдсонгүй · ашигласан · хугацаа дууссан — ГУРВУУЛАА ижил мессеж
        // (lld.md §6.9 шийдвэр 2: ялгаатай хариу нь кодын оршихыг задруулна).
        output.textContent = ok
          ? 'Progress moved to this device.'
          : 'That code did not work. It may be expired or already used.';
        announce(output.textContent);
        if (ok) rerender();
      });
    };
    redeemInput.addEventListener('keydown', (event) => {
      if ((event as KeyboardEvent).key === 'Enter') redeem();
    });

    transfer.append(
      el('label', { for: 'redeem-code', text: 'Enter a transfer code from your other device' }),
      redeemInput,
      button('Use this code', redeem),
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
