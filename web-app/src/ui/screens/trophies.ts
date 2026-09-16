/**
 * Trophy Room — Camp-ийн дэд дэлгэц (T-30; AC COS-3, COS-4).
 *
 * ⚠ БҮХ cosmetic харагдана. Нээгдээгүйг НУУХ нь «юу хийвэл юу нээгдэх» гэдгийг
 * далдалж, зорилго тавих боломжийг устгана — тэр нь энэ дэлгэцийн цорын ганц учир.
 * ⚠ Эмхлэн байрлуулалт (`campLayout`) нь ЦЭВЭР дүрслэл: ямар ч XP, нээлт, дүрэмд
 * нөлөөлөхгүй (spec.md D-6). Домэйн талын шалгалт нь `setCampLayout`-д.
 */
import type { GameService, TrophyView } from '../../services/gameService.ts';
import { announce, badge, button, el, h1, toast } from '../components.ts';

const SLOT_LABELS: Record<string, string> = {
  avatarFrame: 'Avatar frames',
  campBanner: 'Camp banners',
  title: 'Titles',
  campDecoration: 'Camp decorations',
  uiAccent: 'UI accents',
  badgeFrame: 'Badge frames',
};

export function renderTrophies(game: GameService, rerender: () => void): HTMLElement {
  const view = game.view;
  const trophies = view.cosmetics();
  const unlocked = trophies.filter((t) => t.unlocked);
  const layout = view.campLayout();

  const root = el('section', { class: 'screen screen-trophies' }, [h1('Trophy Room')]);
  root.append(
    el('p', { class: 'muted', text:
      'Everything you can earn is listed here, locked or not. Cosmetics only change how camp looks — never XP, stamina or what you can unlock.' }),
    el('p', { class: 'muted', 'data-testid': 'trophy-count', text:
      `${unlocked.length} of ${trophies.length} unlocked` }),
  );

  for (const slot of view.cosmeticSlots()) {
    const inSlot = trophies.filter((t) => t.slot === slot);
    const group = el('div', { class: 'card trophy-slot-group', 'data-slot-group': slot }, [
      el('h2', { id: `slot-${slot}`, text: SLOT_LABELS[slot] ?? slot }),
    ]);

    // ── Эмхлэн байрлуулалт — картан дээрх товчоор (lld.md §9.4.2).
    // ⚠ ЯГ 6 түлхүүртэй БҮТЭН объект — хэсэгчилсэн засвар байхгүй (plan.md P-25).
    const equip = (id: string | null, label: string): void => {
      const result = game.dispatch('setCampLayout', { slots: { ...layout, [slot]: id } });
      if (result.rejected) {
        toast(`Cannot equip that: ${result.rejected}`, 'warn');
        return;
      }
      announce(id === null ? `${SLOT_LABELS[slot] ?? slot} cleared.` : `${label} equipped.`);
      rerender();
    };

    group.append(
      el('ul', { class: 'trophy-list', 'aria-labelledby': `slot-${slot}` },
        inSlot.map((item) => el('li', {}, [trophyCard(item, layout[slot] === item.id, equip)])),
      ),
    );
    root.append(group);
  }

  return root;
}

/**
 * ⚠ `lld.md §9.4.2` — `Equip` товч нь НЭЭГДЭЭГҮЙ элементэд ОГТ БАЙХГҮЙ (`disabled`
 * биш). `PREREQ_NOT_MET`-д хүргэх замыг UI-д нээлттэй үлдээх нь тоглогчийг
 * мухардалд хүргэнэ. Домэйн талын шалгалт нь `setCampLayout`-д ТЭР ЧИГЭЭРЭЭ үлдэнэ —
 * UI бол тав тух, хамгаалалт БИШ.
 */
function trophyCard(
  item: TrophyView,
  equipped: boolean,
  equip: (id: string | null, label: string) => void,
): HTMLElement {
  const card = el('article', {
    class: `card trophy-card trophy-${item.unlocked ? 'unlocked' : 'locked'}`,
    'data-testid': 'trophy-item',
    'data-cosmetic-id': item.id,
    // ⚠ Төлөв нь АТРИБУТААР ч гарна — өнгө нь чимэглэл, мэдээлэл биш (VIS-4).
    'data-unlocked': item.unlocked ? 'yes' : 'no',
  }, [
    el('h3', { text: item.title }),
    el('p', { class: 'muted', text: `${item.rarity} · ${item.slot}` }),
  ]);

  card.append(badge(item.unlocked ? 'Unlocked' : 'Locked', item.unlocked ? 'ok' : 'warn'));
  card.append(
    el('p', {
      class: 'trophy-source',
      text: item.unlocked ? `Earned by: ${item.unlockText}` : `To unlock: ${item.unlockText}`,
    }),
  );
  if (equipped) card.append(badge('Equipped at camp', 'ok'));

  if (item.unlocked) {
    const action = equipped
      ? button('Unequip', () => equip(null, item.title), { })
      : button('Equip', () => equip(item.id, item.title), { });
    action.setAttribute('data-equip-action', equipped ? 'unequip' : 'equip');
    action.setAttribute('data-cosmetic-id', item.id);
    card.append(action);
  }
  return card;
}
