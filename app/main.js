import { getBounties, getBounty, getLeaderboard, getProfile } from './api.js';
import { board, boardRows, bounty, leaderboard, profile, notFound } from './views.js';
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
  app.onclick = null;
  window.__shotReady = false;
  app.setAttribute('aria-busy', 'true');
  app.innerHTML = '<div class="empty" role="status">Loading live bounties…</div>';
  try {
    const path = location.hash.slice(1) || '/';
    const leaderMatch = path.match(/^\/bounty\/([^/]+)\/leaderboard\/?$/);
    const profileMatch = path.match(/^\/u\/([^/]+)\/?$/);
    const match = path.match(/^\/bounty\/([^/]+)\/?$/);
    if (path === '/') {
      const data = await getBounties();
      if (current !== revision) return;
      app.innerHTML = board(data);
      document.title = 'The opportunity board · make.fun';
      wireBoard(data);
    } else if (leaderMatch) {
      const data = await getLeaderboard(decodeURIComponent(leaderMatch[1]));
      if (current !== revision) return;
      let page = 1;
      const render = () => { app.innerHTML = leaderboard(data, page); };
      render();
      app.onclick = event => {
        const button = event.target.closest('[data-leader-page]');
        if (button) { page = Number(button.dataset.leaderPage); render(); app.focus(); }
      };
      document.title = `${data.competition.title} · Leaderboard · make.fun`;
    } else if (profileMatch) {
      const data = await getProfile(decodeURIComponent(profileMatch[1]));
      if (current !== revision) return;
      app.innerHTML = profile(data);
      document.title = `${data.display_name || data.handle} · make.fun`;
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
      app.innerHTML = notFound();
      document.title = 'Page not found · make.fun';
    }
    window.scrollTo(0, 0);
    await new Promise(resolve => requestAnimationFrame(resolve));
    if (current === revision) window.__shotReady = true;
  } catch (error) {
    if (current !== revision) return;
    if (error.status === 404) {
      app.innerHTML = notFound(location.hash.startsWith('#/u/'));
      document.title = 'Not found · make.fun';
      window.__shotReady = true;
      return;
    }
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
