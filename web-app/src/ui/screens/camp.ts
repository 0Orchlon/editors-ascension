/** Camp — гэрийн бааз (T-32; AC UI-2, DM-3). */
import type { GameService } from '../../services/gameService.ts';
import { announce, badge, button, el, h1, statBar, staminaPips, toast } from '../components.ts';

export function renderCamp(game: GameService, rerender: () => void): HTMLElement {
  const view = game.view;
  const xp = view.xpProgress();
  const stamina = view.stamina();
  const streak = view.streak();
  const daily = view.dailyMission();
  const projects = view.projects();
  const nextProject = projects.find((p) => p.completedAt === null);

  const root = el('section', { class: 'screen screen-camp' }, [h1('Camp')]);

  root.append(
    el('div', { class: 'card', 'data-testid': 'camp-identity' }, [
      el('h2', { text: `${view.rank()} · Level ${view.level()}` }),
      statBar('XP', xp.current, xp.next ?? xp.current, xp.next === null ? `${xp.current} XP · max rank` : `${xp.current} / ${xp.next} XP`),
      el('p', { class: 'muted', text: `Coins ${view.coins()} · Skill points ${view.skillPoints()}` }),
    ]),
  );

  const staminaCard = el('div', { class: 'card', 'data-testid': 'camp-stamina' }, [
    el('h2', { text: 'Stamina' }),
    staminaPips(stamina.current, stamina.max),
  ]);
  staminaCard.append(
    button('Rest (+3 stamina)', () => {
      const result = game.dispatch('rest', {});
      if (result.rejected) toast(`Cannot rest: ${result.rejected}`, 'warn');
      else {
        announce(`Rested. Stamina is now ${game.view.stamina().current}.`);
        rerender();
      }
    }),
  );
  root.append(staminaCard);

  // Өдрийн даалгавар — байхгүй бол «Rest day», хоосон зай ҮЛДЭЭХГҮЙ (AC DM-3).
  const missionCard = el('div', { class: 'card', 'data-testid': 'camp-daily' }, [
    el('h2', { text: 'Daily mission' }),
  ]);
  if (daily === null) {
    missionCard.append(
      el('p', { text: 'Rest day — nothing is queued for you today.' }),
      button('Roll today’s mission', () => {
        game.dispatch('rollDailyMission', { date: new Date().toISOString().slice(0, 10) });
        rerender();
      }),
    );
  } else {
    missionCard.append(
      el('h3', { text: daily.title }),
      el('p', { text: daily.summary }),
      el('p', { class: 'muted', text: `${daily.estimatedMinutes} min · ${daily.staminaCost} stamina · ${daily.xp} XP` }),
    );
  }
  root.append(missionCard);

  root.append(
    el('div', { class: 'card', 'data-testid': 'camp-streak' }, [
      el('h2', { text: 'Streak' }),
      el('p', { text: `Current ${streak.current} day(s) · Best ${streak.best} day(s)` }),
      streak.lastQualifiedDate === null
        ? el('p', { class: 'muted', text: 'Finish anything today to start a streak.' })
        : el('p', { class: 'muted', text: `Last active ${streak.lastQualifiedDate}` }),
    ]),
  );

  const projectCard = el('div', { class: 'card', 'data-testid': 'camp-project' }, [
    el('h2', { text: 'Next project action' }),
  ]);
  if (nextProject === undefined) {
    projectCard.append(el('p', { text: 'No active project. Start one in the Project Forge.' }));
  } else {
    projectCard.append(
      el('h3', { text: nextProject.title }),
      el('p', { text: nextProject.nextAction.trim() === '' ? 'No next action written yet.' : nextProject.nextAction }),
      el('p', { class: 'muted', text: `${nextProject.doneCount} of 10 milestones done` }),
    );
  }
  root.append(projectCard);

  const loot = view.inventory();
  root.append(
    el('div', { class: 'card', 'data-testid': 'camp-loot' }, [
      el('h2', { text: 'Collection' }),
      loot.length === 0
        ? el('p', { class: 'muted', text: 'No loot yet. Finish a quest and see what turns up.' })
        : el('ul', { class: 'chips' }, loot.map((i) => el('li', {}, [badge(`${i.title} (${i.rarity})`)]))),
    ]),
  );

  return root;
}
