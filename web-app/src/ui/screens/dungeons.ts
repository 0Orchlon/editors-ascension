/**
 * Study Dungeons (T-34; AC DG-2, DG-4).
 *
 * ⚠ «Failed» гэсэн ганц үг ХОРИГЛОГДОНО — унасан үр дүн нь буруу хариулт тус бүрийн
 * тайлбар + дараагийн алхмыг заавал харуулна (AC DG-4).
 */
import type { DungeonCardView, GameService } from '../../services/gameService.ts';
import { announce, badge, button, el, h1, openModal, toast } from '../components.ts';
import { showLevelBanner } from './quests.ts';

export function renderDungeons(game: GameService, rerender: () => void): HTMLElement {
  const root = el('section', { class: 'screen screen-dungeons' }, [h1('Study Dungeons')]);
  root.append(
    el('p', { class: 'muted', text: 'Read the linked material, then prove it. Opening a tutorial earns no XP — passing the mastery check does.' }),
  );

  const list = el('ul', { class: 'quest-list' });
  for (const dungeon of game.view.dungeonList())
    list.append(el('li', {}, [dungeonCard(game, dungeon, rerender)]));
  root.append(list);

  return root;
}

function dungeonCard(game: GameService, dungeon: DungeonCardView, rerender: () => void): HTMLElement {
  const card = el('article', { class: 'card dungeon-card', 'data-dungeon-id': dungeon.id }, [
    el('h3', { text: dungeon.title }),
    el('p', { text: dungeon.conceptGoal }),
    el('p', { class: 'muted', text: `${dungeon.estimatedMinutes} min · ${dungeon.xp} XP · ${dungeon.questions.length} mastery question(s)` }),
  ]);

  const links = el('ul', { class: 'tutorials' });
  for (const ref of dungeon.tutorialRefs)
    links.append(
      el('li', {}, [
        el('a', { href: ref.url, target: '_blank', rel: 'noopener noreferrer', text: `${ref.title} (${ref.minutes} min)` }),
      ]),
    );
  card.append(el('h4', { text: 'Tutorials' }), links);

  if (dungeon.completed) card.append(badge('Passed', 'ok'));
  card.append(button(dungeon.completed ? 'Retry mastery check' : 'Start mastery check', () =>
    openMasteryModal(game, dungeon, rerender),
  ));

  return card;
}

function openMasteryModal(game: GameService, dungeon: DungeonCardView, rerender: () => void): void {
  openModal(`Mastery: ${dungeon.title}`, (close) => {
    const body = el('div', {});
    const answers = new Map<number, number>();

    dungeon.questions.forEach((question, qIndex) => {
      const group = el('fieldset', { class: 'question' }, [el('legend', { text: question.prompt })]);
      question.options.forEach((option, oIndex) => {
        const id = `${dungeon.id}-q${qIndex}-o${oIndex}`;
        const input = el('input', { type: 'radio', name: `${dungeon.id}-q${qIndex}`, id });
        input.addEventListener('change', () => answers.set(qIndex, oIndex));
        group.append(el('div', { class: 'option' }, [input, el('label', { for: id, text: option })]));
      });
      body.append(group);
    });

    const outcome = el('div', { class: 'outcome', role: 'status' });
    body.append(outcome);

    body.append(
      button('Submit answers', () => {
        if (answers.size !== dungeon.questions.length) {
          toast('Answer every question before submitting.', 'warn');
          return;
        }
        const ordered = dungeon.questions.map((_, i) => answers.get(i) ?? -1);
        const result = game.dispatch('dungeonAttempt', { dungeonId: dungeon.id, answers: ordered });
        if (result.rejected) {
          toast(`Attempt refused: ${result.rejected}`, 'warn');
          return;
        }

        const failure = result.events.find((e) => e.type === 'DUNGEON_FAILED');
        if (failure !== undefined) {
          renderFailure(outcome, failure.data as FailureData);
          return;
        }

        for (const event of result.events)
          if (event.type === 'LEVEL_UP') showLevelBanner(String(event.data?.level), String(event.data?.rank));
        announce(`${dungeon.title} passed.`);
        toast(`${dungeon.title} passed.`, 'win');
        close();
        rerender();
      }),
    );

    return body;
  });
}

type FailureData = {
  correct: number;
  total: number;
  nextStep: string;
  wrong: { questionId: string; chosen: number; correct: number; explanation: string }[];
};

/** AC DG-4 — тайлбар бүр + дараагийн алхам. «Failed» ганцаар БИЧИГДЭХГҮЙ. */
function renderFailure(host: HTMLElement, data: FailureData): void {
  host.replaceChildren(
    el('h3', { text: 'Attempt logged — not passed yet' }),
    el('p', { text: `You got ${data.correct} of ${data.total} right. You need 70% to pass. Retries are unlimited.` }),
    el('h4', { text: 'What went wrong' }),
    el('ul', {}, data.wrong.map((w) => el('li', {}, [
      el('strong', { text: 'Why: ' }),
      el('span', { text: w.explanation }),
    ]))),
    el('p', {}, [el('strong', { text: 'Recommended next step: ' }), el('span', { text: data.nextStep })]),
  );
  announce(`Attempt logged. ${data.correct} of ${data.total} correct. Recommended next step: ${data.nextStep}`);
}
