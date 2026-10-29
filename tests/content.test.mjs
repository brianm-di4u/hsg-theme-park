// History cards and originality.
import { click } from './helpers.mjs';

// Real ride, park and event names from research/magic-springs.md that must never appear in play.
const BANNED = ['Arkansas Twister', 'X-Coaster', 'X Coaster', 'Gauntlet', 'Big Bad John', 'Diamond Mine Run', 'Old No. 2', 'Sky Hook', 'Skyhook', 'Roaring Tornado', 'Wild Hog', 'Zyklon', "Twist 'n' Shout", 'The Hawk', 'Sky Shark', 'Brain Drain', 'Plummet Summit', 'Rum Runner', 'Ozark Mountain Taxi', 'Razorback Roundup', 'Fearless Flyers', 'Looney Ballooney', 'Bugga Booga', 'Kit \'n Kaboodle', 'Krazy Kars', 'Leapin\' Lizards', 'Clown Around', 'Dr. Dean', 'Wild Thang', 'Magic Swings', 'Pirates Rock', 'Black Lightning', 'Crystal Cove', 'Kodiak Canyon', 'High Sierra', 'Crystal Lagoon', 'Rapid Falls', 'Boogie Blast', 'Splash Island', 'Grizzly Creek', 'Bear Cub Bend', 'Timberwood', 'Magic Screams', 'Chicken Coop', 'Hurricane', 'Krypton', 'Six Flags'];

export const tests = [
  {
    name: 'history album: every card sourced',
    async run(t) {
      const ids = ['open', 'name', 'flume', 'tower', 'scale', 'debt', 'shuttle', 'woodie', 'reloc', 'lift', 'closed', 'fitraco', 'reopen', 'bond', 'water', 'att2000', 'decline', 'watercal', 'amphi', 'saturday', 'inverted', 'att2004', 'skyloop', 'epr', 'cooler', 'chicken', 'teens', 'wet', 'gator', 'ostrich', 'iqzoo', 'mtntower'];
      for (const id of ids) await t.game('act', 'collect', id);
      await click(t, 'screen', 'history');
      const cards = await t.page.$$eval('#screen .card', (els) => els.map((e) => ({ src: !!e.querySelector('.src'), txt: e.textContent, body: (e.querySelector('p') || {}).textContent || '' })));
      t.equal(cards.length, ids.length, 'all cards listed');
      t.expect(cards.every((c) => c.src && /Source: /.test(c.txt)), 'every card names its source');
      t.expect(cards.every((c) => !/Arkansas Twister|X-Coaster|Gauntlet|Old No\. 2|Sky Hook/.test(c.body)), 'card text names no rides (sources keep their article titles)');
      t.expect(/32 of 32 cards collected/.test(await t.page.textContent('#screen')), 'count shown');
      await t.shot('01-album');
      await t.checkLayout();
    },
  },
  {
    name: 'originality: no real ride or park names in play',
    viewports: ['desktop'],
    async run(t) {
      await t.seed(9);
      const texts = [];
      for (const sc of [1, 2, 3, 4, 5, 6]) {
        await t.game('newGame', { scenario: sc, tutorial: false });
        const s = await t.state();
        texts.push(...s.objects.map((o) => o.name), s.scenario.title, ...s.scenario.goals.map((g) => g.label));
        for (const p of ['rides', 'water', 'shops', 'scenery', 'coasters', 'concerts', 'staff', 'marketing']) {
          await t.game('act', 'panel', p);
          texts.push(await t.page.textContent('#panel'));
        }
      }
      await t.game('act', 'panel', null);
      texts.push(await t.page.textContent('#hud'));
      // scenario intros (play text, not the history cards)
      await t.page.evaluate(() => window.__game.scene('campaign'));
      texts.push(await t.page.$$eval('.scard', (els) => els.map((e) => e.textContent).join(' ')));
      const all = texts.join(' \n ');
      const hits = BANNED.filter((b) => all.includes(b));
      t.equal(hits.length, 0, `no real ride/park names in play text${hits.length ? ': ' + hits.join(', ') : ''}`);
      t.expect(!/Magic Springs/.test(all), 'the real park is never named in play');
    },
  },
];
