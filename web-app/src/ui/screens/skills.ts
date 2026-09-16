/**
 * Skill Tree v2 — track таб, capstone, respec, prestige (T-31; AC PRG-5, SKL-2, SKL-3, MST-6).
 *
 * ⚠ Татгалзлын ШАЛТГААН нь бүрэн харагдана: capstone-ийн гурван нөхцөлийн аль нь
 * дутсаныг НЭРЛЭНЭ (SKL-2). «Locked» гэж ганцаар бичих нь тоглогчийг таалгана.
 * ⚠ Дүрмийг ЭНД дахин бичихгүй — `gaps`, `currency`, `respecStatus` бүгд
 * `gameService`-ээр домэйнээс ирнэ (`QX-7`).
 */
import type { GameService, SkillNodeView } from '../../services/gameService.ts';
import { announce, badge, button, el, h1, toast } from '../components.ts';

/**
 * Сонгосон таб нь ЦЭВЭР дэлгэцийн төлөв — save-д хадгалагдахгүй.
 * ⚠ Модулийн хэмжээнд: `rerender()` нь дэлгэцийг шинээр угсардаг тул дотоод
 * хувьсагч нь дахин зурахад тэг болж, тоглогч табаа алдах байв.
 */
let activeTrack: string | null = null;

export function renderSkills(game: GameService, rerender: () => void): HTMLElement {
  const view = game.view;
  const tracks = view.masteryTracks();
  if (activeTrack === null || !tracks.some((t) => t.tag === activeTrack))
    activeTrack = tracks[0]!.tag;

  const root = el('section', { class: 'screen screen-skills' }, [h1('Skill Tree')]);

  root.append(
    el('p', { class: 'muted', 'data-testid': 'skill-points', text:
      `Skill points available: ${view.skillPoints()} · Mastery points available: ${view.masteryPoints()}` }),
    el('p', { class: 'muted', text:
      'Tier-1 nodes are paid with skill points from levelling. Deeper nodes are paid with mastery points, earned by working inside one track.' }),
  );

  // ── Track таб — `aria-pressed` нь сонголтыг ӨНГӨӨС үл хамааран дамжуулна (VIS-4).
  const tabs = el('div', { class: 'track-tabs', role: 'group', 'aria-label': 'Mastery tracks' });
  for (const track of tracks) {
    const tab = button(`${track.label} · Lv ${track.level}`, () => {
      activeTrack = track.tag;
      rerender();
    }, { class: 'btn btn-tab' });
    tab.setAttribute('data-testid', 'track-tab');
    tab.setAttribute('data-track', track.tag);
    tab.setAttribute('aria-pressed', track.tag === activeTrack ? 'true' : 'false');
    tabs.append(tab);
  }
  root.append(tabs);

  const current = tracks.find((t) => t.tag === activeTrack)!;

  // ── Mastery дэлгэрэнгүй + prestige
  const detail = el('div', { class: 'card', 'data-testid': 'mastery-detail' }, [
    el('h2', { text: `${current.label} mastery` }),
    el('p', { text:
      `Level ${current.level} · ${current.xp} XP${current.xpToNext === null ? ' · max level' : ` of ${current.xpToNext} XP to the next level`}` }),
    el('p', { class: 'muted', text: `Prestiged ${current.prestigeCount}×` }),
  ]);
  if (current.level >= view.prestigeLevel()) {
    detail.append(
      el('p', { class: 'muted', text:
        'Prestige restarts this track at level 1. The mastery points you already earned are kept — nothing you unlocked is taken back.' }),
    );
    const prestige = button('Prestige this track', () => {
      const result = game.dispatch('prestigeMastery', { tag: current.tag });
      if (result.rejected) {
        toast(`Cannot prestige: ${result.rejected}`, 'warn');
        return;
      }
      announce(`${current.label} prestiged.`);
      rerender();
    });
    prestige.setAttribute('data-testid', 'prestige-button');
    detail.append(prestige);
  }
  root.append(detail);

  // ── Respec — cooldown нь ТЕКСТЭЭР, чимээгүй идэвхгүй товч БИШ (SKL-3).
  const respecStatus = view.respecStatus();
  const nodes = view.skillTree().filter((s) => s.track === activeTrack);
  const unlockedHere = nodes.filter((s) => s.unlocked).length;
  const respecCard = el('div', { class: 'card', 'data-testid': 'respec' }, [
    el('h2', { text: 'Respec this tree' }),
    el('p', { class: 'muted', id: 'respec-note', text: respecReason(respecStatus.daysLeft, unlockedHere) }),
  ]);
  const respec = button(`Respec the ${current.label} tree`, () => {
    const result = game.dispatch('respecTree', { track: current.tag });
    if (result.rejected) {
      toast(`Cannot respec: ${result.detail ?? result.rejected}`, 'warn');
      return;
    }
    announce(`${current.label} tree refunded.`);
    rerender();
  }, { disabled: !respecStatus.available || unlockedHere === 0, describedBy: 'respec-note' });
  respec.setAttribute('data-testid', 'respec-button');
  respecCard.append(respec);
  root.append(respecCard);

  const list = el('ul', { class: 'quest-list' });
  for (const skill of nodes) list.append(el('li', {}, [skillCard(game, skill, rerender)]));
  root.append(list);

  return root;
}

function respecReason(daysLeft: number, unlockedHere: number): string {
  if (daysLeft > 0)
    return `Respec is on cooldown — it opens again in ${daysLeft} day(s). The cooldown is shared by every tree.`;
  if (unlockedHere === 0) return 'Nothing is unlocked in this tree yet, so there is nothing to refund.';
  return 'Refunds every node in this tree in the currency you paid, then starts a 7 day cooldown across all trees.';
}

function skillCard(game: GameService, skill: SkillNodeView, rerender: () => void): HTMLElement {
  const currencyLabel = skill.currency === 'skillPoints' ? 'skill point' : 'mastery point';
  const card = el('article', {
    class: 'card skill-card',
    'data-skill-id': skill.id,
    'data-track': skill.track,
    'data-tier': String(skill.tier),
  }, [
    el('h3', { text: skill.title }),
    el('p', { text: skill.description }),
    el('p', { class: 'muted', text: `Tier ${skill.tier} · Cost: ${skill.cost} ${currencyLabel}` }),
  ]);
  if (skill.tier === 3) card.append(badge('Capstone', 'muted'));

  if (skill.prerequisites.length > 0)
    card.append(el('p', { class: 'muted', text: `Requires: ${skill.prerequisites.join(', ')}` }));

  if (skill.unlocked) {
    card.append(badge('Unlocked', 'ok'));
    return card;
  }

  // AC SKL-2 — дутсан нөхцөл БҮРИЙГ нэрлэнэ, зөвхөн эхнийхийг биш.
  if (skill.gaps.length > 0) {
    card.append(
      el('ul', { class: 'capstone-gaps' },
        skill.gaps.map((gap) => el('li', { class: 'capstone-gap', text: gap })),
      ),
    );
  }

  if (skill.lockReason !== null) {
    card.append(el('p', { class: 'lock-reason' }, [badge(skill.lockReason, 'warn')]));
    card.append(button('Unlock', () => undefined, { disabled: true }));
    return card;
  }

  card.append(button('Unlock', () => {
    const result = game.dispatch('unlockSkill', { skillId: skill.id });
    if (result.rejected) toast(`Cannot unlock: ${result.detail ?? result.rejected}`, 'warn');
    else {
      announce(`${skill.title} unlocked.`);
      rerender();
    }
  }));
  return card;
}
