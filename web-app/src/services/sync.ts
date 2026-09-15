/**
 * Серверийн эвлэрүүлэг (lld.md §7.6, §7.7, §6.9; AC BE-7, BE-11, BE-12, BE-14).
 *
 * ⚠ Сервер бүрэн унтарсан үед апп БҮРЭН ажиллана — sync нь нэмэлт, шаардлага биш.
 * ⚠ Сервер амжилттай хариулбал түүний `state` нь ЭРХ БҮХИЙ: локал optimistic
 * тооцоолол ба серверийн үр дүн зөрвөл серверийнх ялна.
 */
import type { GameState } from '@shared/types/index.ts';
import type { ActionQueue } from './actionQueue.ts';
import type { ApiClient, Credentials } from './apiClient.ts';
import type { Storage } from './persistence.ts';

export const CREDS_KEY = 'ea.creds.v1';
export const ETAG_KEY = 'ea.save.etag';

/** lld.md §7.6 — ЯГ энэ дөрөв. Нэмэх бол LLD-ээс эхэлнэ. */
export type SyncStatus = 'offline' | 'syncing' | 'synced' | 'error';

export type SyncDeps = {
  api: ApiClient;
  queue: ActionQueue;
  storage: Storage;
  /** Бүтэн `PUT /save`-д явуулах одоогийн төлөв (§7.6 алхам 5, §7.7). */
  getState: () => GameState;
  /** Локал save-ийн хугацаа — серверийнхтэй харьцуулж «аль нь шинэ»-г шийднэ. */
  localUpdatedAt?: () => string | null;
  onState: (state: GameState) => void;
  onStatus?: (status: SyncStatus) => void;
  /** Тестэд солигдоно — бодит хүлээлт тестийг удаашруулна. */
  sleep?: (ms: number) => Promise<void>;
};

export function createSync(deps: SyncDeps) {
  const { api, queue, storage } = deps;
  const sleep = deps.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  let status: SyncStatus = 'offline';

  /**
   * ⚠ Илгээлтүүд ЦУВААЛНА. `dispatch`-ийн авто-түлхэлт ба ил `kick()` зэрэг ажиллавал
   * нэг үйлдэл ХОЁР хүсэлтээр явж болзошгүй. Цуваалснаар дуудагч мөн өмнөх
   * илгээлт дуусахыг хүлээж чадна — «дуусаагүй байхад шалгах» уралдаан алга болно.
   */
  let chain: Promise<void> = Promise.resolve();

  const setStatus = (next: SyncStatus): void => {
    status = next;
    deps.onStatus?.(next);
  };

  const readCreds = (): Credentials | null => {
    const raw = storage.getItem(CREDS_KEY);
    if (raw === null) return null;
    try {
      const parsed = JSON.parse(raw) as Credentials;
      return parsed.playerId && parsed.token ? parsed : null;
    } catch {
      return null;
    }
  };

  const writeCreds = (creds: Credentials): void => storage.setItem(CREDS_KEY, JSON.stringify(creds));

  const etag = (): string => storage.getItem(ETAG_KEY) ?? '*';

  /** Анх удаа нэргүй тоглогч үүсгэнэ. Сервер байхгүй бол ЧИМЭЭГҮЙ бүтэлгүйтнэ. */
  async function ensurePlayer(): Promise<Credentials | null> {
    const existing = readCreds();
    if (existing !== null) return existing;

    const created = await api.createPlayer();
    if (!created.ok) {
      setStatus(created.offline ? 'offline' : 'error');
      return null;
    }
    writeCreds(created.value);
    return created.value;
  }

  /**
   * §7.6 алхам 1 — дараалал хоосон үед сервер илүү шинэ эсэхийг шалгана.
   * `ifNewer` нь өөр төхөөрөмжөөс ирсэн ажлыг татна, ГЭХДЭЭ энэ төхөөрөмжийн
   * илүү шинэ ажлыг ДАРАХГҮЙ. Ил дуудсан `pull()` нь болзолгүй (шилжүүлэг).
   */
  async function pullSave(opts: { ifNewer: boolean }): Promise<GameState | null> {
    const creds = readCreds();
    if (creds === null) return null;

    const result = await api.getSave(creds);
    if (!result.ok) {
      setStatus(result.offline ? 'offline' : 'error');
      return null;
    }
    // ⚠ Итгэлцлийн хил — гэмтсэн/хоосон хариу нь тоглогчийн төлвийг `undefined`
    // болгож аппыг унагаана. Хариу нь save биш бол ТАВИХГҮЙ.
    if (result.value?.state === undefined) {
      setStatus('error');
      return null;
    }
    if (result.etag !== undefined) storage.setItem(ETAG_KEY, result.etag);

    const localAt = deps.localUpdatedAt?.() ?? null;
    const serverIsNewer = localAt === null || result.value.updatedAt > localAt;
    if (!opts.ifNewer || serverIsNewer) deps.onState(result.value.state);
    setStatus('synced');
    return result.value.state;
  }

  /**
   * Дараалал алдагдсан эсвэл import хийсэн төлвийг бүтнээр тавина
   * (plan.md P-9 — last-write-wins, ердийн тоглолтод ашиглахгүй).
   */
  async function pushFullSave(state: GameState, at: string): Promise<boolean> {
    const creds = await ensurePlayer();
    if (creds === null) return false;

    const payload = { schemaVersion: state.schemaVersion, updatedAt: at, state };

    let result = await api.putSave(creds, payload, etag());
    if (!result.ok && result.status === 409) {
      // Бидний ETag хуучирсан — серверийнхийг аваад дахин бичнэ.
      const current = await api.getSave(creds);
      if (current.ok && current.etag !== undefined) {
        storage.setItem(ETAG_KEY, current.etag);
        result = await api.putSave(creds, payload, current.etag);
      }
    }

    if (!result.ok) {
      setStatus(result.offline ? 'offline' : 'error');
      return false;
    }
    storage.setItem(ETAG_KEY, result.value.etag);
    setStatus('synced');
    return true;
  }

  /** §7.6-ийн flush — нэг багц. `true` буцаавал үлдсэнийг үргэлжлүүлнэ. */
  async function flushBatch(creds: Credentials, retriesLeft: number): Promise<boolean> {
    const batch = queue.peekBatch();
    if (batch.length === 0) return false;

    const result = await api.postActions(creds, batch, etag());

    if (result.ok) {
      queue.dropUpTo(result.value.results.map((r) => r.actionId));
      storage.setItem(ETAG_KEY, result.value.etag);
      // Серверийн төлөв ЭРХ БҮХИЙ — локал таамаглалыг солино.
      deps.onState(result.value.state);
      return queue.size() > 0;
    }

    if (retriesLeft <= 0) {
      setStatus(result.offline ? 'offline' : 'error');
      return false;
    }

    // 409 = өөр төхөөрөмж завсарт бичсэн. Серверийн төлвийг аваад ТҮҮН ДЭЭР дахин илгээнэ.
    if (result.status === 409) {
      const pulled = await pullSave({ ifNewer: false });
      if (pulled === null) return false;
      setStatus('syncing');
      return flushBatch(creds, retriesLeft - 1);
    }

    // 429 = хаалганы хязгаар. `Retry-After`-гүйгээр дахих нь дахин цохино.
    if (result.status === 429) {
      await sleep((result.retryAfterSeconds ?? 1) * 1000);
      return flushBatch(creds, retriesLeft - 1);
    }

    // 422 = домэйн татгалзал: дахин илгээх нь дахин татгалзана, дарааллаас хасна
    // (эс бөгөөс дараалал үүрд гацна).
    if (result.status === 422) {
      queue.dropUpTo(batch.map((a) => a.actionId));
      setStatus('error');
      return queue.size() > 0;
    }

    setStatus(result.offline ? 'offline' : 'error');
    return false;
  }

  async function pushOnce(): Promise<void> {
    const batch = queue.peekBatch();

    // §7.6 алхам 5 — дараалал задрахгүй болсон бол үйлдлүүд алдагдсан;
    // бүтэн save-аар эвлэрүүлнэ (last-write-wins).
    if (queue.isCorrupted()) {
      queue.clear();
      setStatus('syncing');
      await pushFullSave(deps.getState(), new Date().toISOString());
      return;
    }

    if (batch.length === 0) {
      await pullSave({ ifNewer: true });
      return;
    }

    setStatus('syncing');
    const creds = await ensurePlayer();
    if (creds === null) return;

    // ⚠ Ахиц ГАРААГҮЙ бол зогсоно: сервер багцаас цөөн үр дүн буцаавал дараалал
    // богиносохгүй бөгөөд энэ давталт ҮҮРД эргэнэ (хөтөч бүхэлдээ зогсоно).
    let more = true;
    while (more) {
      const before = queue.size();
      more = await flushBatch(creds, 1);
      if (queue.size() >= before) break;
    }
    if (status === 'syncing') setStatus('synced');
  }

  /** Дарааллыг илгээнэ. Өмнөх илгээлт явж байвал түүний ард ЖАГСАНА. */
  function push(): Promise<void> {
    chain = chain.then(pushOnce).catch(() => undefined);
    return chain;
  }

  return {
    status: (): SyncStatus => status,
    credentials: readCreds,
    setCredentials: writeCreds,
    ensurePlayer,

    push,

    pushFullSave,

    /** Серверээс төлөв татах — өөр төхөөрөмж дээр үргэлжлүүлэхэд (болзолгүй). */
    pull: (): Promise<GameState | null> => pullSave({ ifNewer: false }),

    /** §6.9 — энэ төхөөрөмжийн ажлыг нөгөө рүү зөөх код. */
    async createTransferCode(): Promise<{ code: string; expiresAt: string } | null> {
      const creds = await ensurePlayer();
      if (creds === null) return null;
      // Код нь СЕРВЕР дээрх save-ийг зөөнө — хүлээгдэж буй үйлдэл эхлээд очих ёстой,
      // эс бөгөөс нөгөө төхөөрөмж хуучин прогресс авна.
      await push();
      const result = await api.createTransferCode(creds);
      if (!result.ok) {
        setStatus(result.offline ? 'offline' : 'error');
        return null;
      }
      return result.value;
    },

    /**
     * §6.9 — код хүлээн авна. Амжилттай бол ШИНЭ таних тэмдэг болж,
     * серверийн төлөв болзолгүй татагдана (энэ төхөөрөмжийн шинэ тоглоом ялахгүй).
     * ⚠ Бүтэлгүйтвэл одоогийн таних тэмдэг, дараалал ХЭВЭЭР — тоглогч юу ч алдахгүй.
     */
    async redeemTransferCode(code: string): Promise<boolean> {
      const result = await api.redeemTransferCode(code);
      if (!result.ok) {
        setStatus(result.offline ? 'offline' : 'error');
        return false;
      }
      // Хуучин тоглогчийн дараалал ба ETag шинэ тоглогчид хамаарахгүй.
      queue.clear();
      storage.removeItem(ETAG_KEY);
      writeCreds(result.value);
      return (await pullSave({ ifNewer: false })) !== null;
    },
  };
}

export type Sync = ReturnType<typeof createSync>;
