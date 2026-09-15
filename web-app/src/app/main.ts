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
import { createSoundCues } from '../ui/sound.ts';
import type { SyncStatus } from '../services/sync.ts';
// ⚠ DOM-ийн глобал `Storage` БИШ — сервисийн нарийссан интерфейс (тестэд солигдоно).
import type { Storage } from '../services/persistence.ts';

const ONBOARDED_KEY = 'ea.onboarded.v1';

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

  // A11Y-5 — дуу нь `events$`-ийн дөрвөн event дээр л тоглоно, тохиргоогоор унтрана.
  app.game.events$(createSoundCues(() => app.game.view.settings().soundEnabled));

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
