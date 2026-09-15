/**
 * Хуудас хаагдах үеийн амьдралын мөчлөг (lld.md §7.5; AC SV-6, BE-7).
 *
 * ⚠ Энд шалгаж буй зүйл нь «`flush()` ажилладаг уу» биш — апп ТҮҮНИЙГ ДУУДДАГ эсэх.
 * `persistence.flush()` нь unit тестээр ногоон байсан ч аппын утас нь холбогдоогүй
 * байв: сервергүй тоглогчийн сүүлийн үйлдэл чимээгүй алдагдана.
 */
import { describe, expect, it, vi } from 'vitest';
import { SAVE_KEY } from '../../src/services/persistence.ts';
import { $, $$, go, mount } from './helpers.ts';

const savedState = (raw: string | null): Record<string, unknown> => {
  expect(raw).not.toBeNull();
  return (JSON.parse(raw!) as { state: Record<string, unknown> }).state;
};

describe('page lifecycle flushes the debounced save (§7.5)', () => {
  it('writes the pending save on pagehide', () => {
    const { storage } = mount();
    go('#/settings');
    $<HTMLInputElement>('#set-reduced-motion')!.click();

    // 500ms debounce хүлээж байна — хуудас яг одоо хаагдаж байна.
    expect(storage.getItem(SAVE_KEY)).toBeNull();

    window.dispatchEvent(new Event('pagehide'));

    expect((savedState(storage.getItem(SAVE_KEY)).settings as { reducedMotion: boolean }).reducedMotion).toBe(true);
  });

  it('writes the pending save when the tab is hidden', () => {
    const { storage } = mount();
    go('#/settings');
    $<HTMLInputElement>('#set-sound')!.click();

    expect(storage.getItem(SAVE_KEY)).toBeNull();

    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));

    expect((savedState(storage.getItem(SAVE_KEY)).settings as { soundEnabled: boolean }).soundEnabled).toBe(false);
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
  });
});

/**
 * §7.6 алхам 4 — татгалзлын шалтгаан нь ТОГЛОГЧИД хүрнэ.
 *
 * ⚠ `sync` дотор мессеж үүсгэсэн ч аппын утас холбогдоогүй бол тоглогч зөвхөн
 * дээд мөрийн ерөнхий «Sync problem»-ыг харна — юу болсныг мэдэхгүй.
 */
describe('sync notices reach the player (§7.6 алхам 4)', () => {
  it('shows the server rejection reason as a toast', async () => {
    const fetchImpl = vi.fn(async (url: string | URL | Request) => {
      if (String(url).endsWith('/actions'))
        return new Response(
          JSON.stringify({
            type: 'about:blank#INSUFFICIENT_STAMINA',
            title: 'Unprocessable Content',
            status: 422,
            code: 'INSUFFICIENT_STAMINA',
            detail: 'Not enough stamina.',
          }),
          { status: 422, headers: { 'content-type': 'application/problem+json' } },
        );
      return new Response(JSON.stringify({ playerId: 'p1', token: 't'.repeat(43) }), {
        status: 201,
        headers: { 'content-type': 'application/json' },
      });
    }) as unknown as typeof fetch;

    mount({}, fetchImpl);
    go('#/settings');
    $<HTMLInputElement>('#set-reduced-motion')!.click();

    window.dispatchEvent(new Event('pagehide'));
    await vi.waitFor(() => {
      expect($$('#toast-host .toast').map((t) => t.textContent).join(' ')).toContain('Not enough stamina.');
    });
  });
});
