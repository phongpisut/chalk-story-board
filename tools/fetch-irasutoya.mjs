// Pulls the public Blogger feed of irasutoya.com (title, labels, thumbnail URL) into tools/raw.json.
// Only the index is stored; images stay on Irasutoya's CDN (their terms forbid redistributing the files).
import { writeFileSync } from 'node:fs';

const PAGE = 150, out = [];
for (let start = 1; ; start += PAGE) {
  const url = `https://www.irasutoya.com/feeds/posts/summary?alt=json&max-results=${PAGE}&start-index=${start}`;
  let json;
  for (let tries = 0; ; tries++) {
    try { json = await (await fetch(url)).json(); break; }
    catch (e) { if (tries > 4) throw e; await new Promise(r => setTimeout(r, 2000 * (tries + 1))); }
  }
  const entries = json.feed.entry || [];
  for (const e of entries) {
    const thumb = e.media$thumbnail?.url;
    if (!thumb) continue;
    out.push({ t: e.title.$t, l: (e.category || []).map(c => c.term), u: thumb });
  }
  process.stdout.write(`\r${start + entries.length - 1} / ${json.feed.openSearch$totalResults.$t}`);
  if (entries.length < PAGE) break;
  await new Promise(r => setTimeout(r, 300)); // be polite to the host
}
writeFileSync(new URL('./raw.json', import.meta.url), JSON.stringify(out));
console.log(`\nsaved ${out.length}`);
