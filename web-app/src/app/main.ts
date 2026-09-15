/** Bootstrap entry (T-01). The full shell lands in T-31. */
export function mountApp(host: HTMLElement): void {
  host.innerHTML = '';
  const h1 = document.createElement('h1');
  h1.textContent = "Editor's Ascension";
  host.append(h1);
}

const root = typeof document !== 'undefined' ? document.getElementById('app') : null;
if (root) mountApp(root);
