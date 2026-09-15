/** Quest board + claim модал (T-33; AC MQ-6, PRG-6, MQ-4). */
import type { GameService, QuestCardView } from '../../services/gameService.ts';
import { announce, badge, button, checklist, el, h1, openModal, toast } from '../components.ts';

export function renderQuests(
  game: GameService,
  track: 'main' | 'side',
  rerender: () => void,
): HTMLElement {
  const quests = game.view.questBoard(track);
  const title = track === 'main' ? 'Main Quest Board' : 'Side Quest Board';
  const root = el('section', { class: 'screen screen-quests' }, [h1(title)]);

  root.append(
    el('p', { class: 'muted', text: track === 'main'
      ? 'The campaign. Each quest is claimed by you after the work is done outside the app.'
      : 'The practice gym. Repeatable, and repeat completions award less XP on purpose.' }),
  );

  const worlds = [...new Set(quests.map((q) => q.world))].sort((a, b) => a - b);
  for (const world of worlds) {
    const group = el('div', { class: 'world-group' }, [el('h2', { text: `World ${world}` })]);
    const list = el('ul', { class: 'quest-list' });
    for (const quest of quests.filter((q) => q.world === world))
      list.append(el('li', {}, [questCard(game, quest, rerender)]));
    group.append(list);
    root.append(group);
  }

  return root;
}

function questCard(game: GameService, quest: QuestCardView, rerender: () => void): HTMLElement {
  const card = el('article', { class: 'card quest-card', 'data-quest-id': quest.id }, [
    el('h3', { text: quest.title }),
    el('p', { text: quest.summary }),
  ]);

  const meta = el('p', { class: 'muted' }, [
    el('span', { text: `${quest.estimatedMinutes} min · ${quest.staminaCost} stamina · ${quest.xp} XP` }),
  ]);
  if (quest.track === 'side' && quest.completions > 0)
    meta.append(el('span', { text: ` · done ${quest.completions}× · next award ${quest.xp} XP` }));
  card.append(meta);

  card.append(el('ul', { class: 'chips' }, quest.tags.map((t) => el('li', {}, [badge(String(t))]))));

  if (quest.completed) {
    card.append(badge('Completed', 'ok'));
    if (quest.track !== 'side') return card;
  }

  if (quest.locked && quest.lockReason !== null) {
    // AC MQ-4 — түгжээний ШАЛТГААН ил; тоглогч таах шаардлагагүй.
    card.append(el('p', { class: 'lock-reason' }, [badge(quest.lockReason, 'warn')]));
    card.append(button('Claim victory', () => undefined, { disabled: true }));
    return card;
  }

  card.append(button('Claim victory', () => openClaimModal(game, quest, rerender)));
  return card;
}

/** AC MQ-6 — `victoryConditions` БҮГД тэмдэглэгдтэл Claim товч идэвхгүй. */
function openClaimModal(game: GameService, quest: QuestCardView, rerender: () => void): void {
  openModal(`Claim: ${quest.title}`, (close) => {
    const body = el('div', {}, [
      el('p', { text: quest.description }),
      el('h3', { text: 'Deliverables' }),
      el('ul', {}, quest.deliverables.map((d) => el('li', { text: d }))),
      el('h3', { text: 'Confirm every victory condition' }),
    ]);

    let checked: number[] = [];
    const claim = button('Claim victory', () => {
      const result = game.dispatch('claimQuest', { questId: quest.id, checkedConditions: checked });
      if (result.rejected) {
        toast(`Claim refused: ${result.rejected}`, 'warn');
        return;
      }
      for (const event of result.events) {
        if (event.type === 'LEVEL_UP') showLevelBanner(String(event.data?.level), String(event.data?.rank));
        if (event.type === 'ACHIEVEMENT_UNLOCKED') toast(`Achievement: ${String(event.data?.title)}`, 'win');
        if (event.type === 'LOOT_DROPPED') toast(`Loot: ${String(event.data?.title)}`, 'win');
        if (event.type === 'ENCOUNTER_TRIGGERED') toast(`${String(event.data?.title)} — ${String(event.data?.callToAction)}`);
      }
      announce(`${quest.title} claimed. You gained ${quest.xp} XP.`);
      close();
      rerender();
    }, { disabled: true });

    body.append(
      checklist(quest.victoryConditions, (next) => {
        checked = next;
        const complete = next.length === quest.victoryConditions.length;
        claim.disabled = !complete;
        if (complete) claim.removeAttribute('aria-disabled');
        else claim.setAttribute('aria-disabled', 'true');
      }, quest.id),
      el('h3', { text: 'Stretch goals' }),
      el('ul', {}, quest.stretchGoals.map((s) => el('li', { text: s }))),
      el('h3', { text: 'Reflection' }),
      el('p', { text: quest.reflectionPrompt }),
      claim,
    );

    return body;
  });
}

/** AC PRG-6 — түвшин ахихад дэлгэцийн баннер. */
export function showLevelBanner(level: string, rank: string): void {
  const host = document.getElementById('banner-host');
  const message = `Level ${level} — you are now ${rank}`;
  announce(message);
  if (host === null) return;
  host.replaceChildren(
    el('div', { class: 'banner', role: 'status' }, [
      el('strong', { text: '★ Level up! ' }),
      el('span', { text: message }),
    ]),
  );
  setTimeout(() => host.replaceChildren(), 8000);
}
