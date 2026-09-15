/** Project Forge + boss үнэлгээ (T-35; AC PJ-1, BS-5). */
import type { GameService } from '../../services/gameService.ts';
import { announce, badge, button, el, h1, openModal, toast } from '../components.ts';
import { showLevelBanner } from './quests.ts';

export function renderForge(game: GameService, rerender: () => void): HTMLElement {
  const root = el('section', { class: 'screen screen-forge' }, [h1('Project Forge')]);
  root.append(el('p', { class: 'muted', text: 'Projects are where the campaign turns into portfolio work. Ten milestones, 25 XP each.' }));

  const form = el('form', { class: 'card' }, [el('h2', { text: 'Start a project' })]);
  const input = el('input', { type: 'text', id: 'new-project-title', maxlength: '120', required: 'required' });
  form.append(el('label', { for: 'new-project-title', text: 'Project title' }), input);
  form.append(button('Create project', () => {
    const title = input.value.trim();
    if (title === '') {
      toast('Give the project a title first.', 'warn');
      return;
    }
    const result = game.dispatch('projectCreate', { title });
    if (result.rejected) toast(`Cannot create: ${result.rejected}`, 'warn');
    else {
      announce(`Project ${title} created.`);
      rerender();
    }
  }));
  form.addEventListener('submit', (e) => e.preventDefault());
  root.append(form);

  for (const project of game.view.projects()) {
    const card = el('article', { class: 'card project-card', 'data-project-id': project.id }, [
      el('h2', { text: project.title }),
      el('p', { class: 'muted', text: `${project.doneCount} of 10 milestones · ${project.completedAt === null ? 'in progress' : 'complete'}` }),
    ]);
    if (project.completedAt !== null) card.append(badge('Completed', 'ok'));

    const list = el('ul', { class: 'checklist milestones' });
    for (const milestone of project.milestones) {
      const id = `${project.id}-${milestone.key}`;
      const box = el('input', { type: 'checkbox', id });
      box.checked = milestone.done;
      // ⚠ Дахин тэмдэглэх нь XP нэмэхгүй (AC PJ-3) — домэйн no-op буцаана.
      if (milestone.done) box.disabled = true;
      box.addEventListener('change', () => {
        const result = game.dispatch('projectMilestone', { projectId: project.id, key: milestone.key });
        if (result.rejected) {
          toast(`Cannot mark: ${result.rejected}`, 'warn');
          box.checked = false;
          return;
        }
        for (const event of result.events)
          if (event.type === 'LEVEL_UP') showLevelBanner(String(event.data?.level), String(event.data?.rank));
        announce(`${milestone.key} marked done.`);
        rerender();
      });
      list.append(el('li', {}, [box, el('label', { for: id, text: milestone.key })]));
    }
    card.append(list);

    const notes = el('textarea', { id: `${project.id}-notes`, rows: '3', maxlength: '4000' });
    notes.value = project.notes;
    const next = el('input', { type: 'text', id: `${project.id}-next`, maxlength: '500' });
    next.value = project.nextAction;
    const score = el('input', { type: 'number', id: `${project.id}-score`, min: '0', max: '10' });
    score.value = project.selfScore === null ? '' : String(project.selfScore);

    card.append(
      el('label', { for: `${project.id}-notes`, text: 'Notes' }), notes,
      el('label', { for: `${project.id}-next`, text: 'Next action' }), next,
      el('label', { for: `${project.id}-score`, text: 'Self score (0–10)' }), score,
      button('Save project details', () => {
        const payload: Record<string, unknown> = {
          projectId: project.id,
          notes: notes.value,
          nextAction: next.value,
        };
        if (score.value.trim() !== '') payload.selfScore = Number(score.value);
        const result = game.dispatch('projectUpdate', payload);
        if (result.rejected) toast(`Cannot save: ${result.rejected} — self score must be 0 to 10.`, 'warn');
        else {
          announce('Project details saved.');
          rerender();
        }
      }),
    );

    root.append(card);
  }

  root.append(renderBossSection(game, rerender));
  return root;
}

function renderBossSection(game: GameService, rerender: () => void): HTMLElement {
  const section = el('div', { class: 'card boss-section' }, [el('h2', { text: 'Boss assessments' })]);

  // AC BS-5 — «дасгалжуулах хэрэгсэл, гэрчилгээ БИШ» тайлбар заавал харагдана.
  section.append(
    el('p', { class: 'note', 'data-testid': 'boss-disclaimer', text:
      'These scores are a coaching aid, not an objective certification. They exist to point at your weakest area, not to grade you.' }),
  );

  for (const boss of game.view.bosses()) {
    const row = el('div', { class: 'boss-row', 'data-boss-id': boss.id }, [
      el('h3', { text: boss.title }),
      el('p', { text: boss.summary }),
    ]);
    if (boss.completed) row.append(badge('Passed', 'ok'));
    if (boss.locked && boss.lockReason !== null) {
      row.append(el('p', { class: 'lock-reason' }, [badge(boss.lockReason, 'warn')]));
    } else {
      row.append(button('Score this attempt', () => openBossModal(game, boss.id, boss.title, rerender)));
    }
    section.append(row);
  }

  const attempts = game.view.bossAttempts();
  if (attempts.length > 0) {
    section.append(el('h3', { text: 'Attempt history' }));
    section.append(
      el('ul', {}, attempts.map((a) =>
        el('li', { text: `${a.at.slice(0, 10)} · ${a.bossId} · ${a.total}/60 · ${a.tier}` }),
      )),
    );
  }

  return section;
}

function openBossModal(game: GameService, bossId: string, title: string, rerender: () => void): void {
  openModal(`Boss: ${title}`, (close) => {
    const body = el('div', {}, [
      el('p', { class: 'note', text: 'Score yourself honestly from 0 to 10 in each category. This is coaching, not certification.' }),
    ]);

    const scores = new Map<string, number>();
    const total = el('p', { class: 'muted', role: 'status', text: 'Total: 0 / 60' });

    const refreshTotal = (): void => {
      const sum = [...scores.values()].reduce((a, b) => a + b, 0);
      total.textContent = `Total: ${sum} / 60 · tier ${game.view.bossTier(sum)}`;
    };

    for (const category of game.view.bossCategories()) {
      const id = `boss-${category.key}`;
      const slider = el('input', { type: 'range', min: '0', max: '10', step: '1', value: '0', id });
      const readout = el('output', { for: id, text: '0' });
      scores.set(category.key, 0);
      slider.addEventListener('input', () => {
        scores.set(category.key, Number(slider.value));
        readout.textContent = slider.value;
        refreshTotal();
      });
      body.append(el('div', { class: 'slider-row' }, [
        el('label', { for: id, text: category.label }), slider, readout,
      ]));
    }
    body.append(total);

    body.append(button('Log attempt', () => {
      const payload = Object.fromEntries(scores);
      const result = game.dispatch('bossAttempt', { bossId, scores: payload });
      if (result.rejected) {
        toast(`Attempt refused: ${result.rejected}`, 'warn');
        return;
      }
      const logged = result.events.find((e) => e.type === 'BOSS_ATTEMPT_LOGGED');
      const message = logged?.data?.message;
      if (typeof message === 'string') {
        // AC BS-3 — унасан үед ЗӨВХӨН «Failed» гэхгүй, дараагийн алхам хэлнэ.
        body.append(el('p', { class: 'outcome', role: 'status', text: message }));
        announce(message);
        rerender();
        return;
      }
      for (const event of result.events)
        if (event.type === 'LEVEL_UP') showLevelBanner(String(event.data?.level), String(event.data?.rank));
      toast(`${title} passed.`, 'win');
      close();
      rerender();
    }));

    return body;
  });
}
