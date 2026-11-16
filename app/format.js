export const esc = value => String(value ?? '').replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
export function money(value) {
  if (value == null || !Number.isFinite(Number(value))) return '—';
  const n = Number(value);
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 });
}
export const pot = b => Number(b.potUsd ?? b.rewardAmount ?? 0);
export const closed = b => Number.isFinite(Date.parse(b.deadline)) && Date.parse(b.deadline) <= Date.now();
export const state = b => closed(b) ? 'Entries closed' : b.status === 'open' ? 'Open for entries' : (b.status || 'Unknown');
export function date(value) {
  return Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }) + ' UTC' : 'Not announced';
}
export function timeLeft(value) {
  const ms = Date.parse(value) - Date.now();
  if (!Number.isFinite(ms)) return 'No deadline announced';
  if (ms <= 0) return 'Entries closed';
  const minutes = Math.ceil(ms / 60000), hours = Math.floor(minutes / 60), days = Math.floor(hours / 24);
  return days ? `${days}d ${hours % 24}h left` : hours ? `${hours}h ${minutes % 60}m left` : `${minutes}m left`;
}
// A deliberately small, safe block renderer. API HTML is always displayed as text.
export function prose(value) {
  if (value == null) return '<p>No details published.</p>';
  const text = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
  return text.split(/\n\s*\n/).map(block => {
    const lines = block.split('\n');
    let html = '', list = false;
    for (const line of lines) {
      const heading = line.match(/^#{1,6}\s+(.+)$/);
      const item = line.match(/^[-*] (.*)$/);
      if (list && !item) { html += '</ul>'; list = false; }
      if (heading) html += `<h3>${esc(heading[1])}</h3>`;
      else if (item) {
        if (!list) { html += '<ul>'; list = true; }
        html += `<li>${esc(item[1])}</li>`;
      } else html += `<p>${esc(line)}</p>`;
    }
    return html + (list ? '</ul>' : '');
  }).join('');
}
