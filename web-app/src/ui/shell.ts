/** Апп бүрхүүл — skip link, top bar, 8 замын навигаци (T-31; AC UI-1, A11Y-1). */
import type { GameService } from '../services/gameService.ts';
import type { SyncStatus } from '../services/sync.ts';
import { el, statBar, staminaPips } from './components.ts';

export const ROUTES = [
  { hash: '#/camp', label: 'Camp' },
  { hash: '#/quests', label: 'Main Quests' },
  { hash: '#/side', label: 'Side Quests' },
  { hash: '#/dungeons', label: 'Study Dungeons' },
  { hash: '#/skills', label: 'Skill Tree' },
  { hash: '#/forge', label: 'Project Forge' },
  { hash: '#/achievements', label: 'Achievements' },
  { hash: '#/settings', label: 'Settings' },
] as const;

export type RouteHash = (typeof ROUTES)[number]['hash'];

export function buildShell(root: HTMLElement): void {
  root.replaceChildren(
    // Гарны хэрэглэгч навигацийг алгасаж контент руу шууд очно (AC A11Y-1).
    el('a', { href: '#main', class: 'skip-link', text: 'Skip to main content' }),
    el('header', { class: 'topbar', id: 'topbar' }),
    el('nav', { class: 'nav', id: 'nav', 'aria-label': 'Screens' }),
    el('main', { id: 'main', class: 'main', tabindex: '-1' }),
    el('div', { id: 'banner-host', class: 'banner-host' }),
    el('div', { id: 'toast-host', class: 'toast-host' }),
    // Визуал далд ч дэлгэц уншигчид сонсогдоно (AC A11Y-3).
    el('div', { id: 'announcer', class: 'visually-hidden', role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true' }),
    el('div', { id: 'modal-host' }),
  );
}

export function renderTopBar(game: GameService, status: SyncStatus): void {
  const host = document.getElementById('topbar');
  if (host === null) return;
  const xp = game.view.xpProgress();
  const stamina = game.view.stamina();

  host.replaceChildren(
    el('div', { class: 'topbar-identity' }, [
      el('strong', { text: 'Editor’s Ascension' }),
      el('span', { class: 'muted', text: ` ${game.view.rank()} · Level ${game.view.level()}` }),
    ]),
    statBar('XP', xp.current, xp.next ?? xp.current, xp.next === null ? `${xp.current} XP` : `${xp.current} / ${xp.next} XP`),
    staminaPips(stamina.current, stamina.max),
    el('span', { class: 'coins', text: `⬤ ${game.view.coins()} coins` }),
    // Статус нь ТЕКСТ — өнгө дангаараа мэдээлэл дамжуулахгүй (AC A11Y-3).
    el('span', { class: `sync sync-${status}`, 'data-testid': 'sync-status', text: syncLabel(status) }),
  );
}

function syncLabel(status: SyncStatus): string {
  switch (status) {
    case 'synced':
      return 'Synced';
    case 'pending':
      return 'Sync pending';
    case 'offline':
      return 'Offline — progress saved on this device';
    default:
      return 'Local only';
  }
}

export function renderNav(active: string): void {
  const host = document.getElementById('nav');
  if (host === null) return;
  const list = el('ul', { class: 'nav-list' });
  for (const route of ROUTES) {
    const link = el('a', { href: route.hash, text: route.label });
    // `aria-current` нь идэвхтэй хуудсыг өнгөнөөс ҮЛ ХАМААРАН дамжуулна.
    if (route.hash === active) link.setAttribute('aria-current', 'page');
    list.append(el('li', {}, [link]));
  }
  host.replaceChildren(list);
}
