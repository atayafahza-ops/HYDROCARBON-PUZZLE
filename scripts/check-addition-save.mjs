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
  if (actual !== wanted) failures.push(`${label}: got ${JSON.stringify(actual)}, want ${JSON.stringify(wanted)}`);
};

// ---- Fresh save: both modes start empty and independent ----
const save = await import('../src/systems/save.js');
const { EXPERIMENTS } = await import('../src/additionLab/data/experiments.js');
const progress = await import('../src/additionLab/systems/additionProgress.js');

expect('experiment count', save.getAdditionExperimentCount(), 40);
expect('max stars', save.getAdditionMaxStars(), 120);
expect('fresh addition stars', save.getAdditionTotalStars(), 0);
expect('fresh addition xp', save.getAdditionTotalXp(), 0);
expect('AL-01 unlocked', save.isExperimentUnlocked('AL-01'), true);
expect('AL-02 locked', save.isExperimentUnlocked('AL-02'), false);
expect('unknown id locked', save.isExperimentUnlocked('AL-99'), false);
expect('continue starts at AL-01', save.getContinueExperimentId(), 'AL-01');
expect('fresh rank', progress.getRank().id, 'junior');
expect('fresh achievements', progress.getUnlockedAchievementCount(), 0);

// ---- Campaign progress first, then Addition Lab must not disturb it ----
save.recordCompletion(1, { stars: 3, xp: 200 });
save.recordCompletion(2, { stars: 2, xp: 150 });
const campaignStars = save.getTotalStars();
const campaignXp = save.getTotalXp();

const summary = save.recordExperimentCompletion('AL-01', { score: 100, stars: 3, xp: 165, hintsUsed: 0, attempts: 0 });
expect('completion returns stars', summary.stars, 3);
expect('AL-01 recorded', save.isExperimentComplete('AL-01'), true);
expect('AL-01 best stars', save.getExperimentBestStars('AL-01'), 3);
expect('AL-02 opens', save.isExperimentUnlocked('AL-02'), true);
expect('AL-03 still locked', save.isExperimentUnlocked('AL-03'), false);
expect('continue advances', save.getContinueExperimentId(), 'AL-02');
expect('addition stars', save.getAdditionTotalStars(), 3);
expect('addition xp', save.getAdditionTotalXp(), 165);
expect('zone stars', save.getAdditionZoneStars('alkene-fundamentals'), 3);
expect('zone completed', save.getAdditionZoneCompleted('alkene-fundamentals'), 1);
expect('campaign stars untouched', save.getTotalStars(), campaignStars);
expect('campaign xp untouched', save.getTotalXp(), campaignXp);
expect('campaign level 3 opened by campaign only', save.isLevelUnlocked(3), true);

// ---- Achievements and rank respond to Addition Lab only ----
const unlocked = progress.getAchievements().filter((achievement) => achievement.unlocked).map((achievement) => achievement.id);
expect('first-reaction unlocked', unlocked.includes('first-reaction'), true);
expect('perfect-run unlocked', unlocked.includes('perfect-run'), true);
expect('no-hints unlocked', unlocked.includes('no-hints'), true);
expect('master-chemist locked', unlocked.includes('master-chemist'), false);
expect('rank still junior at 165 xp', progress.getRank().id, 'junior');
expect('next rank', progress.getNextRank().id, 'assistant');

// ---- Replay keeps the best record ----
save.recordExperimentCompletion('AL-01', { score: 70, stars: 2, xp: 120, hintsUsed: 2, attempts: 3 });
expect('replay keeps best stars', save.getExperimentBestStars('AL-01'), 3);
expect('replay keeps best score', save.getExperimentRecord('AL-01').score, 100);
expect('replay keeps best xp', save.getAdditionTotalXp(), 165);
expect('replay tracks attempts', save.getExperimentRecord('AL-01').attempts, 3);

// ---- Persistence survives a reload ----
const persisted = JSON.parse(localStorage.getItem(KEY));
expect('persisted addition result', persisted.additionLab.results['AL-01'].stars, 3);
const reloaded = await import('../src/systems/save.js?reload=1');
expect('stars survive reload', reloaded.getExperimentBestStars('AL-01'), 3);
expect('unlock survives reload', reloaded.isExperimentUnlocked('AL-02'), true);
expect('campaign survives reload', reloaded.getTotalStars(), campaignStars);

// ---- GDD core requirement: campaign reset must never touch Addition Lab ----
reloaded.resetProgress();
expect('campaign reset clears stars', reloaded.getTotalStars(), 0);
expect('campaign reset locks level 3', reloaded.isLevelUnlocked(3), false);
expect('campaign reset keeps addition stars', reloaded.getAdditionTotalStars(), 3);
expect('campaign reset keeps addition xp', reloaded.getAdditionTotalXp(), 165);
expect('campaign reset keeps AL-02 open', reloaded.isExperimentUnlocked('AL-02'), true);
expect('campaign reset keeps settings', reloaded.getSettings().sfx, true);

// ---- Addition reset must never touch the campaign ----
reloaded.recordCompletion(5, { stars: 3, xp: 200 });
reloaded.resetAdditionLab();
expect('addition reset clears stars', reloaded.getAdditionTotalStars(), 0);
expect('addition reset clears results', reloaded.getExperimentRecord('AL-01'), null);
expect('addition reset locks AL-02', reloaded.isExperimentUnlocked('AL-02'), false);
expect('addition reset keeps AL-01 open', reloaded.isExperimentUnlocked('AL-01'), true);
expect('addition reset keeps campaign', reloaded.getTotalStars(), 3);
expect('addition reset keeps level 5', reloaded.isLevelUnlocked(5), true);

// ---- Legacy save without additionLab hydrates cleanly ----
localStorage.setItem(KEY, JSON.stringify({
  version: 1,
  levels: { 1: { stars: 3, xp: 200 }, 2: { stars: 3, xp: 200 } },
  lastLevel: 2,
  introSeen: true,
  settings: { sfx: false, reducedMotion: true },
}));
const legacy = await import('../src/systems/save.js?reload=2');
expect('legacy campaign kept', legacy.getTotalStars(), 6);
expect('legacy addition empty', legacy.getAdditionCompletedCount(), 0);
expect('legacy AL-01 open', legacy.isExperimentUnlocked('AL-01'), true);
legacy.recordExperimentCompletion('AL-01', { score: 90, stars: 3, xp: 165 });
expect('legacy gains addition', legacy.getAdditionTotalStars(), 3);
expect('legacy campaign still 6', legacy.getTotalStars(), 6);

// ---- Corrupt addition data is sanitized, campaign untouched ----
localStorage.setItem(KEY, JSON.stringify({
  version: 1,
  levels: { 1: { stars: 2, xp: 150 } },
  lastLevel: 1,
  introSeen: true,
  settings: {},
  additionLab: {
    results: {
      'AL-01': { completed: true, score: 95, stars: 3, xp: 160 },
      'AL-99': { completed: true, score: 100, stars: 3 },
      'AL-02': 'garbage',
      'AL-03': { completed: true, score: 500, stars: 9, xp: -5 },
    },
    lastExperiment: 'AL-99',
  },
}));
const corrupt = await import('../src/systems/save.js?reload=3');
expect('valid record kept', corrupt.getExperimentBestStars('AL-01'), 3);
expect('unknown id dropped', corrupt.getExperimentRecord('AL-99'), null);
expect('garbage dropped', corrupt.getExperimentRecord('AL-02'), null);
expect('out-of-range stars clamped', corrupt.getExperimentBestStars('AL-03') <= 3, true);
expect('out-of-range score clamped', (corrupt.getExperimentRecord('AL-03')?.score ?? 0) <= 100, true);
expect('corrupt campaign kept', corrupt.getTotalStars(), 2);

// ---- Full completion unlocks everything and maxes the archive ----
// additionProgress binds to the original save module instance, so use it here.
localStorage.removeItem(KEY);
save.resetEverything();
for (const experiment of EXPERIMENTS) {
  save.recordExperimentCompletion(experiment.id, { score: 100, stars: 3, xp: 205, hintsUsed: 0 });
}
expect('all 40 complete', save.getAdditionCompletedCount(), 40);
expect('all stars', save.getAdditionTotalStars(), 120);
expect('last experiment open', save.isExperimentUnlocked('AL-40'), true);
expect('continue at the end', save.getContinueExperimentId(), 'AL-40');
expect('master rank', progress.getRank().id, 'master');
expect('no next rank', progress.getNextRank(), null);
expect('rank progress 100', progress.getRankProgress().percent, 100);
expect('all achievements', progress.getUnlockedAchievementCount(), progress.ACHIEVEMENTS.length);
expect('campaign still empty', save.getTotalStars(), 0);

// resetEverything clears both (the only nuclear option).
save.resetEverything();
expect('everything clears addition', save.getAdditionTotalStars(), 0);
expect('everything clears campaign', save.getTotalStars(), 0);

console.log(`addition save checks: ${failures.length ? 'FAIL' : 'ok'}`);
for (const failure of failures) console.log('  ' + failure);
process.exit(failures.length ? 1 : 0);