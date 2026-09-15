/** Hash router (lld.md §7.4; AC UI-1). */
import { ROUTES, type RouteHash } from '../ui/shell.ts';

export const DEFAULT_ROUTE: RouteHash = '#/camp';

export function currentRoute(hash: string): RouteHash {
  const found = ROUTES.find((r) => r.hash === hash);
  return found?.hash ?? DEFAULT_ROUTE;
}

export function onRouteChange(fn: (route: RouteHash) => void): () => void {
  const handler = (): void => fn(currentRoute(window.location.hash));
  window.addEventListener('hashchange', handler);
  return () => window.removeEventListener('hashchange', handler);
}
