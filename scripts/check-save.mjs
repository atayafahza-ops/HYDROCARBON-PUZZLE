const KEY = 'carbon-code-save-v1';
const store = new Map();
globalThis.localStorage = {
  getItem: (key) => (store.has(key) ? store.get(key) : null),
  setItem: (key, value) => store.set(key, String(value)),
  removeItem: (key) => store.delete(key),
  clear: () => store.clear(),
};

const failures = [];
const expect = (label, actual, wanted) => {
  if (actual !== wanted) failures.push(`${label}: got ${actual}, want ${wanted}`);
};

// A save written by the 50-level build, plus a stale id that no longer maps to a level.
const legacy = {
  version: 1,
  levels: {},
  lastLevel: 50,
  introSeen: true,
  settings: { sfx: false, reducedMotion: true },
};
for (let id = 1; id <= 50; id += 1) {
  legacy.levels[id] = { stars: 3, xp: 200, attempts: 2, hintsUsed: 1, completedAt: 'old', lastPlayedAt: 'old' };
}
legacy.levels['999'] = { stars: 3, xp: 200 };
legacy.levels['garbage'] = 'not-an-object';
localStorage.setItem(KEY, JSON.stringify(legacy));

const save = await import('../src/systems/save.js');
const { LEVELS } = await import('../src/data/levels.js');

expect('level count', save.getLevelCount(), 100);
expect('max stars', save.getMaxStars(), 300);
expect('legacy stars kept', save.getTotalStars(), 150);
expect('legacy xp kept', save.getTotalXp(), 10000);
expect('legacy settings kept', save.getSettings().sfx, false);
expect('intro seen kept', save.getSave().introSeen, true);
expect('unknown id dropped', save.getSave().levels['999'], undefined);
expect('garbage id dropped', save.getSave().levels['garbage'], undefined);
expect('level 1 unlocked', save.isLevelUnlocked(1), true);
expect('level 50 unlocked', save.isLevelUnlocked(50), true);
expect('level 51 unlocked after 50', save.isLevelUnlocked(51), true);
expect('level 52 still locked', save.isLevelUnlocked(52), false);
expect('zone 6 stars', save.getZoneStars('heavy-chain'), 0);
expect('zone 6 max', save.getZoneMaxStars('heavy-chain'), 30);
expect('continue target', save.getContinueLevelId(), 51);
expect('missing level never unlocks', save.isLevelUnlocked(101), false);

save.recordCompletion(51, { stars: 2 });
expect('52 opens after 51', save.isLevelUnlocked(52), true);
expect('continue advances', save.getContinueLevelId(), 52);

const persisted = JSON.parse(localStorage.getItem(KEY));
expect('written to storage', persisted.levels['51'].stars, 2);

// Reload the module the way a browser refresh would.
const reloaded = await import('../src/systems/save.js?reload=1');
expect('stars survive reload', reloaded.getBestStars(51), 2);
expect('unlock survives reload', reloaded.isLevelUnlocked(52), true);
expect('continue survives reload', reloaded.getContinueLevelId(), 52);

// Replaying an older level must not lower its record.
reloaded.recordCompletion(51, { stars: 1 });
expect('replay keeps best stars', reloaded.getBestStars(51), 2);

// A gap in an old save keeps the levels it already opened.
localStorage.setItem(KEY, JSON.stringify({
  version: 1,
  levels: { 7: { stars: 2, xp: 150 } },
  lastLevel: 7,
  introSeen: true,
  settings: {},
}));
const gapped = await import('../src/systems/save.js?reload=2');
expect('starred level stays open', gapped.isLevelUnlocked(7), true);
expect('next after starred opens', gapped.isLevelUnlocked(8), true);
expect('unrelated level locked', gapped.isLevelUnlocked(9), false);
expect('gap continue picks first open', gapped.getContinueLevelId(), 1);

// Completing everything opens the final zone.
localStorage.removeItem(KEY);
const full = await import('../src/systems/save.js?reload=3');
for (const level of LEVELS) full.recordCompletion(level.id, { stars: 3 });
expect('all stars', full.getTotalStars(), 300);
expect('last level unlocked', full.isLevelUnlocked(100), true);
expect('continue at the end', full.getContinueLevelId(), 100);
expect('completed count', full.getCompletedCount(), 100);

full.resetProgress();
expect('reset clears stars', full.getTotalStars(), 0);
expect('reset keeps level 1', full.isLevelUnlocked(1), true);
expect('reset locks 51', full.isLevelUnlocked(51), false);

console.log(`save checks: ${failures.length ? 'FAIL' : 'ok'}`);
for (const failure of failures) console.log('  ' + failure);
process.exit(failures.length ? 1 : 0);
