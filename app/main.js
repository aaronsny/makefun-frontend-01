import { getBounties, getBounty } from './api.js';
import { board, boardRows, bounty } from './views.js';
import { esc, pot } from './format.js';
const app = document.querySelector('#app');
let revision = 0;
const selection = { query: '', sort: 'deadline', page: 1 };
function wireBoard(data) {
  const filter = document.querySelector('#filter'), sort = document.querySelector('#sort');
  filter.value = selection.query;
  sort.value = selection.sort;
  function update() {
    const items = data.items.filter(b => b.title.toLowerCase().includes(selection.query.toLowerCase().trim()));
    items.sort((a, b) => selection.sort === 'pot' ? pot(b) - pot(a) || Date.parse(a.deadline) - Date.parse(b.deadline) : Date.parse(a.deadline) - Date.parse(b.deadline) || pot(b) - pot(a));
    const pages = Math.max(1, Math.ceil(items.length / 25));
    selection.page = Math.min(selection.page, pages);
    document.querySelector('#count').textContent = `${items.length} bounties · page ${selection.page} of ${pages}`;
    document.querySelector('#rows').innerHTML = boardRows(items.slice((selection.page - 1) * 25, selection.page * 25));
    document.querySelector('#pages').innerHTML = Array.from({ length: pages }, (_, i) => `<button data-page="${i + 1}" ${selection.page === i + 1 ? 'aria-current="page"' : ''}>${i + 1}</button>`).join('');
  }
  filter.addEventListener('input', () => { selection.query = filter.value; selection.page = 1; update(); });
  sort.addEventListener('change', () => { selection.sort = sort.value; selection.page = 1; update(); });
  document.querySelector('#pages').addEventListener('click', event => {
    const button = event.target.closest('[data-page]');
    if (button) { selection.page = Number(button.dataset.page); update(); document.querySelector('#board-title').scrollIntoView(); }
  });
  update();
}
async function route() {
  const current = ++revision;
  window.__shotReady = false;
  app.setAttribute('aria-busy', 'true');
  app.innerHTML = '<div class="empty" role="status">Loading live bounties…</div>';
  try {
    const path = location.hash.slice(1) || '/';
    const match = path.match(/^\/bounty\/([^/]+)\/?$/);
    if (path === '/') {
      const data = await getBounties();
      if (current !== revision) return;
      app.innerHTML = board(data);
      document.title = 'The opportunity board · make.fun';
      wireBoard(data);
    } else if (match) {
      const data = await getBounty(decodeURIComponent(match[1]));
      if (current !== revision) return;
      app.innerHTML = bounty(data);
      document.title = `${data.title} · make.fun`;
      // Local section links scroll without replacing the hash route.
      app.querySelectorAll('.tabs a[href^="#"]').forEach(anchor => {
        if (!anchor.getAttribute('href').startsWith('#/')) anchor.addEventListener('click', event => { event.preventDefault(); app.querySelector(anchor.getAttribute('href'))?.scrollIntoView({ behavior: 'smooth' }); });
      });
    } else {
      app.innerHTML = '<div class="empty"><h1>This view is on the way.</h1><p>Leaderboard and profile pages arrive in the next session.</p><a href="#/">← Back to bounties</a></div>';
      document.title = 'View coming soon · make.fun';
      return;
    }
    window.scrollTo(0, 0);
    await new Promise(resolve => requestAnimationFrame(resolve));
    if (current === revision) window.__shotReady = true;
  } catch (error) {
    if (current !== revision) return;
    app.innerHTML = `<div class="empty" role="alert"><h1>Couldn’t load this page</h1><p>${esc(error.message)}</p><button id="retry">Try again</button> <a href="#/">All bounties</a></div>`;
    document.querySelector('#retry').addEventListener('click', route);
  } finally { if (current === revision) app.removeAttribute('aria-busy'); }
}
document.querySelector('.skip').addEventListener('click', event => {
  event.preventDefault();
  app.focus();
  app.scrollIntoView();
});
window.addEventListener('hashchange', route);
route();
