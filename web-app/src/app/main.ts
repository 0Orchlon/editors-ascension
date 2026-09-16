/** Хөтчийн эхлэл (T-31, T-40). */
import { createApp } from './createGame.ts';
import { currentRoute, onRouteChange } from './router.ts';
import { announce, toast } from '../ui/components.ts';
import { buildShell, renderNav, renderTopBar } from '../ui/shell.ts';
import { renderCamp } from '../ui/screens/camp.ts';
import { renderQuests } from '../ui/screens/quests.ts';
import { renderDungeons } from '../ui/screens/dungeons.ts';
import { renderSkills } from '../ui/screens/skills.ts';
import { renderForge } from '../ui/screens/forge.ts';
import { renderAchievements } from '../ui/screens/achievements.ts';
import { applyMotionPreference, renderSettings } from '../ui/screens/settings.ts';
import { play } from '../ui/fx.ts';
import { applyTheme, worldPalette } from '../ui/theme.ts';
import type { SyncStatus } from '../services/sync.ts';
// ⚠ DOM-ийн глобал `Storage` БИШ — сервисийн нарийссан интерфейс (тестэд солигдоно).
import type { Storage } from '../services/persistence.ts';

const ONBOARDED_KEY = 'ea.onboarded.v1';

/** lld.md §9.2 — эдгээр маршрут л тоглогчийн идэвхтэй дэлхийн палитрыг өмсөнө. */
const WORLD_ROUTES = new Set<string>(['#/quests', '#/side', '#/dungeons', '#/skills']);

export function boot(root: HTMLElement, storage: Storage = window.localStorage): void {
  let status: SyncStatus = 'offline';
  const app = createApp({
    storage,
    onStatus: (next) => { status = next; renderTopBar(app.game, status); },
    // ⚠ Дээд мөрийн статус нь «ямар нэг зүйл буруу» л гэдгийг хэлнэ — ЯАГААД
    // гэдгийг зөвхөн энэ мессеж дамжуулна (§7.6 алхам 4).
    onNotice: (text) => { toast(text, 'warn'); announce(text); },
  });

  buildShell(root);

  const paint = (): void => {
    const route = currentRoute(window.location.hash);
    const main = document.getElementById('main');
    if (main === null) return;

    renderTopBar(app.game, status);
    renderNav(route);
    // VIS-1 — палитр нь МАРШРУТААС гарна; дэлгэцийн DOM нь дэлхийг мэдэхгүй.
    applyTheme(
      WORLD_ROUTES.has(route) ? worldPalette(app.game.view.activeWorld()) : 'camp',
      app.game.view.settings().colorBlindSafe,
    );

    const screen =
      route === '#/quests' ? renderQuests(app.game, 'main', paint)
      : route === '#/side' ? renderQuests(app.game, 'side', paint)
      : route === '#/dungeons' ? renderDungeons(app.game, paint)
      : route === '#/skills' ? renderSkills(app.game, paint)
      : route === '#/forge' ? renderForge(app.game, paint)
      : route === '#/achievements' ? renderAchievements(app.game)
      : route === '#/settings' ? renderSettings({ game: app.game, sync: app.sync, rerender: paint })
      : renderCamp(app.game, paint);

    main.replaceChildren(screen);
    // Route солигдоход гарчиг руу фокус — гарны хэрэглэгч байрлалаа мэднэ (AC A11Y-1).
    document.getElementById('screen-title')?.focus();
  };

  // FX-1…FX-7 — анимац, дуу, `aria-live` мэдэгдэл нь ГАНЦ хаалгаар (`fx.play`).
  // ⚠ Тохиргоо нь дуудалт БҮРД шинээр уншигдана: горим солиход дахин бүртгэх шаардлагагүй.
  app.game.events$((events) => {
    play(events, () => {
      const settings = app.game.view.settings();
      return {
        reducedMotion: settings.reducedMotion,
        soundEnabled: settings.soundEnabled,
        soundVolume: settings.soundVolume,
      };
    });
  });

  onRouteChange(paint);
  applyMotionPreference(app.game.view.settings().reducedMotion);
  paint();

  if (app.warning !== undefined) {
    toast(app.warning, 'warn');
    announce(app.warning);
  }

  if (storage.getItem(ONBOARDED_KEY) === null) {
    storage.setItem(ONBOARDED_KEY, '1');
    toast('Welcome. Start at Camp: take the daily mission, do the work outside the app, then claim it.', 'info');
  }

  // `beforeunload` нь мобайл дээр найдваргүй — эдгээр хоёр л найдвартай (lld.md §7.5).
  // ⚠ Дараалал нь эхлээд ДИСК рүү: `kick()` нь async бөгөөд хуудас хаагдахад
  // дуусахгүй байж болно, `flush()` нь синхрон бөгөөд ҮРГЭЛЖ гүйцнэ.
  const persist = (): void => {
    app.flush();
    void app.kick();
  };
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') persist();
  });
  window.addEventListener('pagehide', persist);
  window.addEventListener('online', () => void app.kick());
}

if (typeof document !== 'undefined') {
  const root = document.getElementById('app');
  if (root !== null) boot(root);
}
