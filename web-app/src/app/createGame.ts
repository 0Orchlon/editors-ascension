/**
 * Аппын угсралт — DOM-гүйгээр бүрэн угсарч болно, тиймээс тест нь ижил замаар ажиллана.
 */
import { buildPack } from '@shared/content/index.ts';
import { createActionQueue } from '../services/actionQueue.ts';
import { createApiClient } from '../services/apiClient.ts';
import { createGameService, type GameService } from '../services/gameService.ts';
import { createPersistence, type Storage } from '../services/persistence.ts';
import { createSync, type Sync, type SyncStatus } from '../services/sync.ts';

export type AppDeps = {
  storage: Storage;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  now?: () => string;
  newId?: () => string;
  onStatus?: (status: SyncStatus) => void;
  /** Серверийн татгалзал зэрэг тоглогчид ХЭЛЭХ мессеж (§7.6 алхам 4). */
  onNotice?: (text: string) => void;
};

export type App = {
  game: GameService;
  sync: Sync;
  warning?: string;
  /** Дарааллыг серверт түлхэнэ. Сервер байхгүй бол ЧИМЭЭГҮЙ өнгөрнө (AC BE-7). */
  kick: () => Promise<void>;
  /**
   * Хүлээгдэж буй debounce бичилтийг ШУУД бичнэ (§7.5).
   * ⚠ Хуудас хаагдахад `kick()` нь хангалтгүй: сервергүй тоглогчийн сүүлийн
   * үйлдэл зөвхөн энэ дуудлагаар localStorage-д хүрнэ.
   */
  flush: () => void;
};

export function createApp(deps: AppDeps): App {
  const pack = buildPack();
  const persistence = createPersistence(deps.storage, deps.now);
  const queue = createActionQueue(deps.storage);
  const loaded = persistence.load();

  const api = createApiClient(deps.baseUrl ?? '', deps.fetchImpl ?? globalThis.fetch?.bind(globalThis));

  // ⚠ `sync` ба `game` нь бие биеэ лавлана: sync нь серверийн төлвийг `game` руу
  // тавина, `game` нь үйлдэл бүрийг sync руу түлхнэ. Мөчлөгийг эзэмшигч объектоор
  // тасална — callback нь ажиллах үедээ `holder.game` аль хэдийн бөглөгдсөн байна.
  const holder: { game?: GameService } = {};
  const sync = createSync({
    api,
    queue,
    storage: deps.storage,
    getState: () => holder.game?.state$.getState() ?? loaded.state,
    // «Сервер илүү шинэ үү» гэдгийг ЛОКАЛ хадгалалтын хугацаагаар шүүнэ —
    // эс бөгөөс энэ төхөөрөмжийн шинэ ажил серверийн хуучнаар дарагдана.
    localUpdatedAt: () => persistence.lastSavedAt(),
    onState: (state) => holder.game?.replaceState(state),
    ...(deps.onStatus === undefined ? {} : { onStatus: deps.onStatus }),
    ...(deps.onNotice === undefined ? {} : { onNotice: deps.onNotice }),
  });

  const game = createGameService({
    pack,
    initial: loaded.state,
    persistence,
    ...(deps.now === undefined ? {} : { now: deps.now }),
    ...(deps.newId === undefined ? {} : { newId: deps.newId }),
    onAction: (action) => {
      queue.enqueue(action);
      // Онлайн бол шууд, офлайн бол дараагийн `kick`-д үлдэнэ.
      void sync.push();
    },
  });

  holder.game = game;

  const app: App = {
    game,
    sync,
    kick: () => sync.push(),
    flush: () => persistence.flush(),
  };
  if (loaded.warning !== undefined) app.warning = loaded.warning;
  return app;
}

export { createPersistence, createActionQueue, createApiClient, createSync, createGameService };
