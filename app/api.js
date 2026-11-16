const ROOT = 'https://make.fun/api';
const cache = new Map();
const pending = new Map();
const TTL = 60_000;

// Cache each resource separately so cursor pages and detail views revalidate correctly.
export async function get(path) {
  const previous = cache.get(path);
  if (previous && Date.now() - previous.time < TTL) return previous.data;
  if (pending.has(path)) return pending.get(path);
  const request = (async () => {
    const response = await fetch(ROOT + path, {
      headers: previous?.etag ? { 'If-None-Match': previous.etag } : {},
      signal: AbortSignal.timeout(20000),
    });
    if (response.status === 304 && previous) {
      previous.time = Date.now();
      return previous.data;
    }
    if (!response.ok) throw new Error(response.status === 404 ? 'This page could not be found.' : `make.fun returned ${response.status}. Please try again.`);
    const data = await response.json();
    cache.set(path, { data, time: Date.now(), etag: response.headers.get('ETag') });
    return data;
  })();
  pending.set(path, request);
  try { return await request; } finally { pending.delete(path); }
}

export async function getBounties() {
  const items = [];
  const cursors = new Set();
  let cursor;
  do {
    const page = await get('/competitions?status=open&activity=times' + (cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''));
    if (!Array.isArray(page.items)) throw new Error('The bounty list is unavailable.');
    items.push(...page.items);
    cursor = page.next_cursor;
    if (cursor && cursors.has(cursor)) throw new Error('The API repeated a page cursor. Please try again.');
    cursors.add(cursor);
  } while (cursor);
  return { items: [...new Map(items.map(item => [item.slug, item])).values()] };
}
export const getBounty = slug => get(`/competitions/${encodeURIComponent(slug)}`);
export const getLeaderboard = slug => get(`/competitions/${encodeURIComponent(slug)}/leaderboard`);
export const getProfile = handle => get(`/profiles/${encodeURIComponent(handle)}`);
