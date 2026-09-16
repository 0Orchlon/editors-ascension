/** Дэлгэц ба навигаци (T-31…T-35; AC UI-1, UI-2, MQ-6, DG-4, PRG-5, PJ-1, BS-5). */
import { beforeEach, describe, expect, it } from 'vitest';
import { ROUTES } from '../../src/ui/shell.ts';
import { $, $$, buttonByText, go, modalButtonByText, mount, text } from './helpers.ts';

beforeEach(() => {
  mount();
});

describe('app shell and navigation (T-31; UI-1)', () => {
  // T-30 — Trophy Room нэмэгдэж 9 боллоо; тоо нь ROUTES-ийн гэрээ хэвээр.
  it('opens all nine screens and shows a heading on each', () => {
    expect(ROUTES).toHaveLength(9);
    for (const route of ROUTES) {
      go(route.hash);
      const heading = $('#screen-title');
      expect(heading, `no heading for ${route.hash}`).not.toBeNull();
      expect(heading!.textContent!.length).toBeGreaterThan(0);
    }
  });

  it('marks the active link with aria-current (A11Y-3)', () => {
    go('#/dungeons');
    const active = $$('.nav-list a').filter((a) => a.getAttribute('aria-current') === 'page');
    expect(active).toHaveLength(1);
    expect(active[0]!.getAttribute('href')).toBe('#/dungeons');
  });

  it('offers a skip link as the first focusable element (A11Y-1)', () => {
    const skip = $('.skip-link');
    expect(skip).not.toBeNull();
    expect(skip!.getAttribute('href')).toBe('#main');
  });

  it('moves focus to the heading when the route changes (A11Y-1)', () => {
    go('#/skills');
    expect(document.activeElement?.id).toBe('screen-title');
  });

  it('falls back to camp for an unknown hash', () => {
    go('#/nonsense');
    expect($('#screen-title')!.textContent).toBe('Camp');
  });

  it('exposes a polite live region for announcements (A11Y-3)', () => {
    const region = $('#announcer');
    expect(region?.getAttribute('aria-live')).toBe('polite');
  });
});

describe('Camp screen (T-32; UI-2)', () => {
  it('shows rank, xp, stamina, daily mission, streak and next project action', () => {
    go('#/camp');
    for (const id of ['camp-identity', 'camp-stamina', 'camp-daily', 'camp-streak', 'camp-project'])
      expect($(`[data-testid="${id}"]`), `missing ${id}`).not.toBeNull();
    expect(text()).toContain('Recruit');
  });

  it('rests and raises stamina', () => {
    go('#/camp');
    // Эхлээд quest claim хийж stamina зарцуулна.
    go('#/quests');
    claimFirstAvailable();
    go('#/camp');
    const before = staminaNow();
    buttonByText('Rest (+3 stamina)')!.click();
    expect(staminaNow()).toBeGreaterThan(before);
  });

  it('offers a rest day when no daily mission is set (DM-3)', () => {
    go('#/camp');
    expect($('[data-testid="camp-daily"]')!.textContent).toContain('Rest day');
  });

  it('rolls a daily mission on request (DM-1)', () => {
    go('#/camp');
    buttonByText('Roll today’s mission')!.click();
    expect($('[data-testid="camp-daily"]')!.textContent).not.toContain('Rest day');
  });
});

describe('Quest board and claim modal (T-33; MQ-6, MQ-4, PRG-6)', () => {
  it('groups the campaign by world and lists all 18 main quests', () => {
    go('#/quests');
    expect($$('.quest-card')).toHaveLength(18);
    expect($$('.world-group').length).toBeGreaterThanOrEqual(5);
  });

  it('shows the reason a locked quest is locked rather than just disabling it (MQ-4)', () => {
    go('#/quests');
    const locked = $$('.quest-card').find((c) => c.querySelector('.lock-reason') !== null);
    expect(locked).toBeDefined();
    expect(locked!.querySelector('.lock-reason')!.textContent!.length).toBeGreaterThan(10);
  });

  it('keeps the claim button disabled until every victory condition is ticked (MQ-6)', () => {
    go('#/quests');
    openFirstClaimModal();
    const claim = modalButtonByText('Claim victory')!;
    expect(claim.disabled).toBe(true);
    expect(claim.getAttribute('aria-disabled')).toBe('true');

    const boxes = $$<HTMLInputElement>('.modal .checklist input[type="checkbox"]');
    expect(boxes.length).toBeGreaterThan(1);

    boxes[0]!.click();
    boxes[0]!.dispatchEvent(new Event('change'));
    expect(modalButtonByText('Claim victory')!.disabled).toBe(true);

    for (const box of boxes.slice(1)) {
      box.click();
      box.dispatchEvent(new Event('change'));
    }
    expect(modalButtonByText('Claim victory')!.disabled).toBe(false);
  });

  it('awards xp when a complete claim is submitted', () => {
    go('#/quests');
    claimFirstAvailable();
    expect($('[data-testid="sync-status"]')).not.toBeNull();
    go('#/camp');
    expect($('[data-testid="camp-identity"]')!.textContent).toContain('60');
  });

  it('shows a level-up banner when the claim crosses a threshold (PRG-6)', () => {
    go('#/quests');
    claimFirstAvailable();
    claimFirstAvailable();
    expect(document.getElementById('banner-host')!.textContent).toContain('Level up');
  });

  it('shows repeat counts and the decayed next award on side quests (SQ-2)', () => {
    go('#/side');
    expect($$('.quest-card').length).toBeGreaterThanOrEqual(20);
    claimFirstAvailable();
    go('#/side');
    const card = $('.quest-card')!;
    expect(card.textContent).toContain('done 1×');
    expect(card.textContent).toContain('next award');
  });
});

describe('Dungeon screen (T-34; DG-2, DG-4)', () => {
  it('lists dungeons with their tutorial links', () => {
    go('#/dungeons');
    expect($$('.dungeon-card').length).toBeGreaterThanOrEqual(10);
    expect($$('.tutorials a').length).toBeGreaterThan(0);
    expect($('.tutorials a')!.getAttribute('href')).toMatch(/^https:\/\//);
  });

  /** ⚠ AC DG-4 — «Failed» гэсэн ганц үг ХОРИГЛОГДОНО. */
  it('explains every wrong answer instead of only saying Failed (DG-4)', () => {
    go('#/dungeons');
    buttonByText('Start mastery check')!.click();

    // Бүх асуултад САНААТАЙ буруу хариулна.
    for (const group of $$('.modal .question')) {
      const options = [...group.querySelectorAll<HTMLInputElement>('input[type="radio"]')];
      const wrong = options[options.length - 1]!;
      wrong.click();
      wrong.dispatchEvent(new Event('change'));
    }
    modalButtonByText('Submit answers')!.click();

    const outcome = $('.modal .outcome')!;
    expect(outcome.textContent).toContain('Attempt logged');
    expect(outcome.textContent).toContain('Recommended next step');
    expect(outcome.textContent).toContain('Why:');
    expect(outcome.textContent!.trim()).not.toBe('Failed');
  });

  it('keeps retries unlimited after a failure (DG-4)', () => {
    go('#/dungeons');
    buttonByText('Start mastery check')!.click();
    for (const group of $$('.modal .question')) {
      const options = [...group.querySelectorAll<HTMLInputElement>('input[type="radio"]')];
      options[options.length - 1]!.click();
      options[options.length - 1]!.dispatchEvent(new Event('change'));
    }
    modalButtonByText('Submit answers')!.click();
    expect(modalButtonByText('Submit answers')).toBeDefined();
  });
});

describe('Skill tree, forge and achievements (T-35; PRG-5, PJ-1, BS-5)', () => {
  it('shows why a skill cannot be unlocked yet (PRG-5)', () => {
    go('#/skills');
    expect($('[data-testid="skill-points"]')!.textContent).toContain('0');
    const locked = $$('.skill-card').find((c) => c.querySelector('.lock-reason') !== null);
    expect(locked).toBeDefined();
    expect(locked!.textContent).toContain('skill point');
  });

  it('unlocks a skill once a point is available (PRG-5)', () => {
    go('#/quests');
    claimFirstAvailable();
    claimFirstAvailable();
    go('#/skills');
    const unlock = buttonByText('Unlock');
    expect(unlock?.disabled).toBe(false);
    unlock!.click();
    expect(text()).toContain('Unlocked');
  });

  it('creates a project with ten milestones in order (PJ-1)', () => {
    go('#/forge');
    const input = $<HTMLInputElement>('#new-project-title')!;
    input.value = 'Short film';
    buttonByText('Create project')!.click();
    expect($$('.project-card')).toHaveLength(1);
    expect($$('.milestones li')).toHaveLength(10);
  });

  it('awards milestone xp once and disables the completed box (PJ-3)', () => {
    go('#/forge');
    $<HTMLInputElement>('#new-project-title')!.value = 'Short film';
    buttonByText('Create project')!.click();
    const box = $<HTMLInputElement>('.milestones input[type="checkbox"]')!;
    box.click();
    box.dispatchEvent(new Event('change'));
    go('#/camp');
    expect($('[data-testid="camp-identity"]')!.textContent).toContain('25');
    go('#/forge');
    expect($<HTMLInputElement>('.milestones input[type="checkbox"]')!.disabled).toBe(true);
  });

  /** AC BS-5 — «дасгалжуулах хэрэгсэл, гэрчилгээ БИШ» тайлбар ЗААВАЛ харагдана. */
  it('states that boss scores are coaching, not certification (BS-5)', () => {
    go('#/forge');
    const note = $('[data-testid="boss-disclaimer"]')!;
    expect(note.textContent).toContain('coaching');
    expect(note.textContent).toContain('not an objective certification');
  });

  it('lists achievements with the requirement spelled out (ACH-1)', () => {
    go('#/achievements');
    expect($$('.achievement-card').length).toBeGreaterThanOrEqual(12);
    expect($('.achievement-card')!.textContent).toMatch(/Reach|Earn|Complete|Clear|Finish|Keep/);
  });
});

/** Claim модалыг нээж бүх нөхцөлийг тэмдэглээд claim дарна. */
function claimFirstAvailable(): void {
  openFirstClaimModal();
  for (const box of $$<HTMLInputElement>('.modal .checklist input[type="checkbox"]')) {
    box.click();
    box.dispatchEvent(new Event('change'));
  }
  modalButtonByText('Claim victory')!.click();
}

function openFirstClaimModal(): void {
  const open = $$<HTMLButtonElement>('.quest-card button').find(
    (b) => b.textContent?.trim() === 'Claim victory' && !b.disabled,
  );
  if (open === undefined) throw new Error('no claimable quest on screen');
  open.click();
}

function staminaNow(): number {
  const label = $('[data-testid="camp-stamina"] .pips')!.getAttribute('aria-label')!;
  return Number(label.match(/Stamina (\d+)/)![1]);
}
