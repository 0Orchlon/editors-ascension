/**
 * Дахин ашиглагдах DOM хэсгүүд (lld.md §7.4).
 *
 * ⚠ A11y дүрэм: интерактив элемент бүр `<button>`/`<a>`/`<input>` — `div` + `onclick`
 * ХОРИГТОЙ. Төлөв зөвхөн өнгөөр дамжихгүй: текст эсвэл дүрс хамт (AC A11Y-3).
 */

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string> = {},
  children: (Node | string)[] = [],
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key === 'class') node.className = value;
    else if (key === 'text') node.textContent = value;
    else node.setAttribute(key, value);
  }
  for (const child of children) node.append(child);
  return node;
}

export const h1 = (text: string): HTMLHeadingElement =>
  // Route солигдоход фокус ЭНД шилжинэ — гарны хэрэглэгч байрлалаа алдахгүй (AC A11Y-1).
  el('h1', { text, tabindex: '-1', id: 'screen-title' });

export function button(
  label: string,
  onClick: () => void,
  opts: { disabled?: boolean; class?: string; describedBy?: string } = {},
): HTMLButtonElement {
  const node = el('button', { type: 'button', class: opts.class ?? 'btn', text: label });
  if (opts.describedBy) node.setAttribute('aria-describedby', opts.describedBy);
  if (opts.disabled) {
    node.disabled = true;
    // ⚠ `aria-disabled` нь туслах технологид «байгаа ч идэвхгүй» гэдгийг хэлнэ.
    node.setAttribute('aria-disabled', 'true');
  }
  node.addEventListener('click', onClick);
  return node;
}

/** Явцын мөр — утга нь ЗӨВХӨН өнгөөр биш, текстээр ч гарна (AC A11Y-3). */
export function statBar(label: string, value: number, max: number, text: string): HTMLElement {
  const pct = max === 0 ? 0 : Math.max(0, Math.min(100, Math.round((value / max) * 100)));
  return el('div', { class: 'statbar' }, [
    el('div', { class: 'statbar-head' }, [
      el('span', { class: 'statbar-label', text: label }),
      el('span', { class: 'statbar-value', text }),
    ]),
    el('div', {
      class: 'statbar-track',
      role: 'progressbar',
      'aria-label': label,
      'aria-valuenow': String(value),
      'aria-valuemin': '0',
      'aria-valuemax': String(max),
      'aria-valuetext': text,
    }, [el('div', { class: 'statbar-fill', style: `width:${pct}%` })]),
  ]);
}

/** Stamina нь дүрс + тоо — өнгө сохор хэрэглэгчид уншигдана (AC A11Y-3). */
export function staminaPips(current: number, max: number): HTMLElement {
  const wrap = el('div', { class: 'pips', role: 'img', 'aria-label': `Stamina ${current} of ${max}` });
  for (let i = 0; i < max; i++)
    wrap.append(el('span', { class: i < current ? 'pip pip-on' : 'pip pip-off', 'aria-hidden': 'true', text: i < current ? '◆' : '◇' }));
  wrap.append(el('span', { class: 'pips-text', text: ` ${current}/${max}` }));
  return wrap;
}

export function badge(text: string, kind: 'ok' | 'warn' | 'muted' = 'muted'): HTMLElement {
  const mark = kind === 'ok' ? '✓ ' : kind === 'warn' ? '⚠ ' : '';
  return el('span', { class: `badge badge-${kind}`, text: `${mark}${text}` });
}

export type ChecklistItem = { label: string; checked: boolean };

/** Claim модалын checklist (AC MQ-6) — бүгд тэмдэглэгдтэл Claim товч идэвхгүй. */
export function checklist(
  items: readonly string[],
  onChange: (checked: number[]) => void,
  idPrefix: string,
): HTMLElement {
  const checked = new Set<number>();
  const list = el('ul', { class: 'checklist' });

  items.forEach((label, index) => {
    const id = `${idPrefix}-c${index}`;
    const input = el('input', { type: 'checkbox', id });
    input.addEventListener('change', () => {
      if (input.checked) checked.add(index);
      else checked.delete(index);
      onChange([...checked].sort((a, b) => a - b));
    });
    list.append(el('li', {}, [input, el('label', { for: id, text: label })]));
  });

  return list;
}

export type ModalHandle = { close: () => void; root: HTMLElement };

/** Нэг зэрэг НЭГ модал. Фокус дотор түгжигдэж, Escape хаана (AC A11Y-1). */
export function openModal(title: string, content: (close: () => void) => Node): ModalHandle {
  const host = document.getElementById('modal-host');
  if (host === null) throw new Error('modal host missing');
  host.replaceChildren();

  const previousFocus = document.activeElement as HTMLElement | null;
  const close = (): void => {
    host.replaceChildren();
    document.removeEventListener('keydown', onKey);
    previousFocus?.focus();
  };

  const onKey = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') close();
    if (event.key !== 'Tab') return;
    const focusable = root.querySelectorAll<HTMLElement>(
      'button:not([disabled]), a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    if (focusable.length === 0) return;
    const first = focusable[0]!;
    const last = focusable[focusable.length - 1]!;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const heading = el('h2', { id: 'modal-title', text: title, tabindex: '-1' });
  const root = el('div', {
    class: 'modal',
    role: 'dialog',
    'aria-modal': 'true',
    'aria-labelledby': 'modal-title',
  }, [heading, el('div', { class: 'modal-body' }, [content(close)])]);
  root.append(button('Close', close, { class: 'btn btn-quiet' }));

  host.append(el('div', { class: 'modal-backdrop' }, [root]));
  document.addEventListener('keydown', onKey);
  heading.focus();

  return { close, root };
}

export function toast(message: string, kind: 'info' | 'win' | 'warn' = 'info'): void {
  const host = document.getElementById('toast-host');
  if (host === null) return;
  const mark = kind === 'win' ? '★' : kind === 'warn' ? '⚠' : 'ℹ';
  const node = el('div', { class: `toast toast-${kind}` }, [
    el('span', { class: 'toast-icon', 'aria-hidden': 'true', text: mark }),
    el('span', { text: message }),
  ]);
  host.append(node);
  setTimeout(() => node.remove(), 6000);
}

/** `aria-live` бүсэд текст тавина — дэлгэц уншигч өөрчлөлтийг сонсоно (AC A11Y-3). */
export function announce(message: string): void {
  const region = document.getElementById('announcer');
  if (region !== null) region.textContent = message;
}
