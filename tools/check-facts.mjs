#!/usr/bin/env node
// Checks every history fact the game displays:
//  1. history cards (src/js/facts.js): each bank ref exists in the audited trivia bank, is `confirmed`
//     and cites the same source; each research ref's quote appears verbatim in the named research file;
//  2. the climate normals the weather uses (src/js/catalog.js CLIMATE) match the research table;
//  3. claims written into the Help "About" text (src/js/ui.js) are backed by confirmed bank items.
//   node tools/check-facts.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const game = path.resolve(here, '..');
const repo = path.resolve(game);
const { FACTS } = await import(pathToFileURL(path.join(game, 'src/js/facts.js')).href);
const { CLIMATE } = await import(pathToFileURL(path.join(game, 'src/js/catalog.js')).href);
const bank = JSON.parse(fs.readFileSync(path.join(repo, 'shared/data/trivia-questions.json'), 'utf8')).questions;
const research = (f) => fs.readFileSync(path.join(repo, 'research', f), 'utf8');

let bad = 0, n = 0;
const fail = (id, msg) => { bad++; console.log(`FAIL ${id}: ${msg}`); };

console.log('History cards');
for (const f of FACTS) {
  for (const r of f.refs) {
    n++;
    if (r.id) {
      const q = bank.find((x) => x.id === r.id);
      if (!q) { fail(f.id, `${r.id} not in the audited bank`); continue; }
      if (q.confidence !== 'confirmed') { fail(f.id, `${r.id} confidence is ${q.confidence}`); continue; }
      if (q.source !== r.source) { fail(f.id, `${r.id} source differs: bank "${q.source}", card "${r.source}"`); continue; }
      console.log(`ok   ${f.id.padEnd(9)} ${r.id}  ${q.answer}`);
    } else {
      const txt = research(r.file);
      if (!txt.includes(r.quote)) { fail(f.id, `quote not found in research/${r.file}: "${r.quote}"`); continue; }
      console.log(`ok   ${f.id.padEnd(9)} research/${r.file}: "${r.quote.slice(0, 50)}${r.quote.length > 50 ? '…' : ''}"`);
    }
  }
}

console.log('\nClimate normals (research/geography-lakes-mountains.md → Climate)');
const geo = research('geography-lakes-mountains.md');
for (const c of CLIMATE) {
  n++;
  const row = geo.split('\n').find((l) => l.startsWith(`| ${c.m} |`));
  if (!row) { fail('climate', `no row for ${c.m}`); continue; }
  const cells = row.split('|').map((s) => s.trim());
  const hi = parseFloat(cells[2]), lo = parseFloat(cells[3]), pr = parseFloat(cells[4]);
  if (hi !== c.hi || lo !== c.lo || pr !== c.pr) fail('climate', `${c.m}: game ${c.hi}/${c.lo}/${c.pr}, research ${hi}/${lo}/${pr}`);
  else console.log(`ok   ${c.m}  high ${hi}°F  low ${lo}°F  precip ${pr} in`);
}

console.log('\nHelp "About" claims (src/js/ui.js)');
const ui = fs.readFileSync(path.join(game, 'src/js/ui.js'), 'utf8');
const CLAIMS = [
  { text: 'opened 1978', id: 'hs-0414' },
  { text: 'closed 1995', id: 'hs-0416' },
  { text: 'reopened 2000 with a water park', id: 'hs-0433' },
  { text: '5,000-seat amphitheater', id: 'hs-0439' },
  { text: 'May is the wettest month', id: 'hs-0176' },
];
for (const c of CLAIMS) {
  n++;
  const q = bank.find((x) => x.id === c.id);
  if (!ui.includes(c.text)) fail('about', `"${c.text}" no longer in ui.js (update this list)`);
  else if (!q || q.confidence !== 'confirmed') fail('about', `${c.id} is not a confirmed bank item`);
  else console.log(`ok   "${c.text}"  ${c.id}  ${q.answer}`);
}

console.log(`\n${n - bad}/${n} checks passed`);
process.exit(bad ? 1 : 0);
