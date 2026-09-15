/**
 * Серверийн эвлэрүүлэг (lld.md §7.6; AC BE-7, BE-11, BE-12).
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

export type SyncStatus = 'offline' | 'synced' | 'pending' | 'local-only';

export type SyncDeps = {
  api: ApiClient;
  queue: ActionQueue;
  storage: Storage;
  onState: (state: GameState) => void;
  onStatus?: (status: SyncStatus) => void;
};

export function createSync(deps: SyncDeps) {
  const { api, queue, storage } = deps;
  let status: SyncStatus = 'local-only';

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

  /** Анх удаа нэргүй тоглогч үүсгэнэ. Сервер байхгүй бол ЧИМЭЭГҮЙ бүтэлгүйтнэ. */
  async function ensurePlayer(): Promise<Credentials | null> {
    const existing = readCreds();
    if (existing !== null) return existing;

    const created = await api.createPlayer();
    if (!created.ok) {
      setStatus('offline');
      return null;
    }
    writeCreds(created.value);
    return created.value;
  }

  async function pushOnce(): Promise<void> {
    const batch = queue.peekBatch();
    if (batch.length === 0) {
      if (status !== 'offline') setStatus('synced');
      return;
    }

    const creds = await ensurePlayer();
    if (creds === null) {
      setStatus('offline');
      return;
    }

    const result = await api.postActions(creds, batch);
    if (!result.ok) {
      // 422 = домэйн татгалзал: дахин илгээх нь дахин татгалзана, дарааллаас хасна
      // (эс бөгөөс дараалал үүрд гацна).
      if (result.status === 422) queue.dropUpTo(batch.map((a) => a.actionId));
      setStatus(result.offline ? 'offline' : 'pending');
      return;
    }

    queue.dropUpTo(result.value.results.map((r) => r.actionId));
    storage.setItem(ETAG_KEY, result.value.etag);
    // Серверийн төлөв ЭРХ БҮХИЙ — локал таамаглалыг солино.
    deps.onState(result.value.state);
    setStatus(queue.size() > 0 ? 'pending' : 'synced');
  }

  return {
    status: (): SyncStatus => status,
    credentials: readCreds,
    setCredentials: writeCreds,
    ensurePlayer,

    /** Дарааллыг илгээнэ. Өмнөх илгээлт явж байвал түүний ард ЖАГСАНА. */
    push(): Promise<void> {
      chain = chain.then(pushOnce).catch(() => undefined);
      return chain;
    },

    /**
     * Дараалал алдагдсан эсвэл import хийсэн төлвийг бүтнээр тавина
     * (plan.md P-9 — last-write-wins, ердийн тоглолтод ашиглахгүй).
     */
    async pushFullSave(state: GameState, at: string): Promise<boolean> {
      const creds = await ensurePlayer();
      if (creds === null) return false;

      const ifMatch = storage.getItem(ETAG_KEY) ?? '*';
      const payload = { schemaVersion: state.schemaVersion, updatedAt: at, state };

      let result = await api.putSave(creds, payload, ifMatch);
      if (!result.ok && result.status === 409) {
        // Бидний ETag хуучирсан — серверийнхийг аваад дахин бичнэ.
        const current = await api.getSave(creds);
        if (current.ok && current.etag !== undefined) {
          storage.setItem(ETAG_KEY, current.etag);
          result = await api.putSave(creds, payload, current.etag);
        }
      }

      if (!result.ok) {
        setStatus(result.offline ? 'offline' : 'pending');
        return false;
      }
      storage.setItem(ETAG_KEY, result.value.etag);
      setStatus('synced');
      return true;
    },

    /** Серверээс төлөв татах — өөр төхөөрөмж дээр үргэлжлүүлэхэд. */
    async pull(): Promise<GameState | null> {
      const creds = readCreds();
      if (creds === null) return null;

      const result = await api.getSave(creds);
      if (!result.ok) {
        if (result.offline) setStatus('offline');
        return null;
      }
      if (result.etag !== undefined) storage.setItem(ETAG_KEY, result.etag);
      deps.onState(result.value.state);
      setStatus('synced');
      return result.value.state;
    },
  };
}

export type Sync = ReturnType<typeof createSync>;
