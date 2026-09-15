/** Achievements (T-35; AC ACH-1). */
import type { GameService } from '../../services/gameService.ts';
import { badge, el, h1 } from '../components.ts';

export function renderAchievements(game: GameService): HTMLElement {
  const all = game.view.achievements();
  const earned = all.filter((a) => a.earned);

  const root = el('section', { class: 'screen screen-achievements' }, [h1('Achievements')]);
  root.append(el('p', { class: 'muted', text: `${earned.length} of ${all.length} earned` }));

  const list = el('ul', { class: 'quest-list' });
  for (const achievement of all) {
    const card = el('article', { class: 'card achievement-card', 'data-achievement-id': achievement.id }, [
      el('h3', { text: achievement.title }),
      el('p', { text: achievement.description }),
      // Предикатыг ил бичнэ — тоглогч юу хийвэл авахаа мэдэх ёстой.
      el('p', { class: 'muted', text: achievement.requirement }),
    ]);
    card.append(achievement.earned ? badge('Earned', 'ok') : badge('Not yet', 'muted'));
    list.append(el('li', {}, [card]));
  }

  root.append(list);
  return root;
}
