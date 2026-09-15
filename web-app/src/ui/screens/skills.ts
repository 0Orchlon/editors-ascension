/** Skill Tree (T-35; AC PRG-5). */
import type { GameService } from '../../services/gameService.ts';
import { announce, badge, button, el, h1, toast } from '../components.ts';

export function renderSkills(game: GameService, rerender: () => void): HTMLElement {
  const root = el('section', { class: 'screen screen-skills' }, [h1('Skill Tree')]);
  const points = game.view.skillPoints();

  root.append(
    el('p', { class: 'muted', 'data-testid': 'skill-points', text: `Skill points available: ${points}` }),
  );

  const list = el('ul', { class: 'quest-list' });
  for (const skill of game.view.skillTree()) {
    const card = el('article', { class: 'card skill-card', 'data-skill-id': skill.id }, [
      el('h3', { text: skill.title }),
      el('p', { text: skill.description }),
      el('p', { class: 'muted', text: `Cost: ${skill.cost} skill point` }),
    ]);

    if (skill.prerequisites.length > 0)
      card.append(el('p', { class: 'muted', text: `Requires: ${skill.prerequisites.join(', ')}` }));

    if (skill.unlocked) {
      card.append(badge('Unlocked', 'ok'));
    } else if (skill.lockReason !== null) {
      // AC PRG-5 — SP хүрэхгүй эсвэл урьдчилсан нөхцөл дутуу бол ШАЛТГААН харагдана.
      card.append(el('p', { class: 'lock-reason' }, [badge(skill.lockReason, 'warn')]));
      card.append(button('Unlock', () => undefined, { disabled: true }));
    } else {
      card.append(button('Unlock', () => {
        const result = game.dispatch('unlockSkill', { skillId: skill.id });
        if (result.rejected) toast(`Cannot unlock: ${result.rejected}`, 'warn');
        else {
          announce(`${skill.title} unlocked.`);
          rerender();
        }
      }));
    }

    list.append(el('li', {}, [card]));
  }

  root.append(list);
  return root;
}
