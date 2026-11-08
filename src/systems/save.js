import { LEVELS, getLevel } from '../data/levels.js';
import { xpForStars } from './score.js';
import { EXPERIMENTS, getExperiment } from '../additionLab/data/experiments.js';

const STORAGE_KEY = 'carbon-code-save-v1';

const freshSave = () => ({
  version: 1,
  levels: {},
  lastLevel: 1,
  introSeen: false,
  settings: {
    sfx: true,
    reducedMotion: false,
  },
  additionLab: {
    results: {},
    lastExperiment: null,
    introSeen: false,
  },
});

function readStorage() {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function sanitizeLevels(levels) {
  if (!levels || typeof levels !== 'object') return {};
  const clean = {};
  for (const [key, value] of Object.entries(levels)) {
    const id = Number(key);
    if (!getLevel(id) || !value || typeof value !== 'object') continue;
    clean[id] = {
      stars: Math.max(0, Math.min(3, Number(value.stars) || 0)),
      xp: Math.max(0, Number(value.xp) || 0),
      attempts: Math.max(0, Number(value.attempts) || 0),
      hintsUsed: Math.max(0, Number(value.hintsUsed) || 0),
      completedAt: value.completedAt ?? null,
      lastPlayedAt: value.lastPlayedAt ?? null,
    };
  }
  return clean;
}

function sanitizeAdditionLab(lab) {
  const base = freshSave().additionLab;
  if (!lab || typeof lab !== 'object') return base;
  const results = {};
  if (lab.results && typeof lab.results === 'object') {
    for (const [key, value] of Object.entries(lab.results)) {
      if (!getExperiment(key) || !value || typeof value !== 'object') continue;
      results[key] = {
        completed: Boolean(value.completed),
        score: Math.max(0, Math.min(100, Number(value.score) || 0)),
        stars: Math.max(0, Math.min(3, Number(value.stars) || 0)),
        xp: Math.max(0, Number(value.xp) || 0),
        hintsUsed: Math.max(0, Number(value.hintsUsed) || 0),
        attempts: Math.max(0, Number(value.attempts) || 0),
        completedAt: value.completedAt ?? null,
        lastPlayedAt: value.lastPlayedAt ?? null,
      };
    }
  }
  return {
    results,
    lastExperiment: getExperiment(lab.lastExperiment) ? lab.lastExperiment : null,
    introSeen: Boolean(lab.introSeen),
  };
}

function hydrate(stored) {
  const base = freshSave();
  if (!stored || typeof stored !== 'object') return base;
  return {
    ...base,
    levels: sanitizeLevels(stored.levels),
    lastLevel: Number(stored.lastLevel) || 1,
    introSeen: Boolean(stored.introSeen),
    settings: {
      ...base.settings,
      ...(stored.settings && typeof stored.settings === 'object' ? stored.settings : {}),
    },
    additionLab: sanitizeAdditionLab(stored.additionLab),
  };
}

let state = hydrate(readStorage());

function persist() {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Progress remains available for this session when storage is blocked.
  }
}

export function getSave() {
  return state;
}

export function getSettings() {
  return state.settings;
}

export function updateSettings(patch) {
  state.settings = { ...state.settings, ...patch };
  persist();
  return state.settings;
}

export function markIntroSeen() {
  if (!state.introSeen) {
    state.introSeen = true;
    persist();
  }
}

export function markLastLevel(levelId) {
  state.lastLevel = Number(levelId) || 1;
  persist();
}

export function getLevelRecord(levelId) {
  return state.levels[levelId] ?? null;
}

export function getBestStars(levelId) {
  return getLevelRecord(levelId)?.stars ?? 0;
}

export function isLevelComplete(levelId) {
  return getBestStars(levelId) > 0;
}

export function getPreviousLevel(levelId) {
  return LEVELS.find((level) => level.id === Number(levelId) - 1) ?? null;
}

export function isLevelUnlocked(levelId) {
  const id = Number(levelId);
  if (!getLevel(id)) return false;
  // Monotone: a level that already earned stars stays open even if an earlier one was skipped.
  return id === 1 || isLevelComplete(id) || isLevelComplete(id - 1);
}

export function getContinueLevelId() {
  const nextIncomplete = LEVELS.find(
    (level) => isLevelUnlocked(level.id) && !isLevelComplete(level.id),
  );
  if (nextIncomplete) return nextIncomplete.id;
  const lastUnlocked = [...LEVELS].reverse().find((level) => isLevelUnlocked(level.id));
  return lastUnlocked?.id ?? 1;
}

export function getTotalStars() {
  return LEVELS.reduce((total, level) => total + getBestStars(level.id), 0);
}

export function getTotalXp() {
  return LEVELS.reduce((total, level) => total + (getLevelRecord(level.id)?.xp ?? 0), 0);
}

export function getMaxStars() {
  return LEVELS.length * 3;
}

export function getLevelCount() {
  return LEVELS.length;
}

export function getCompletedCount() {
  return LEVELS.filter((level) => isLevelComplete(level.id)).length;
}

export function getZoneStars(zoneId) {
  return LEVELS.filter((level) => level.zoneId === zoneId).reduce(
    (total, level) => total + getBestStars(level.id),
    0,
  );
}

export function getZoneMaxStars(zoneId) {
  return LEVELS.filter((level) => level.zoneId === zoneId).length * 3;
}

export function recordCompletion(levelId, { stars, hintsUsed = 0, failedChecks = 0 }) {
  const level = getLevel(levelId);
  if (!level) return null;

  const existing = state.levels[levelId] ?? null;
  const previousStars = existing?.stars ?? 0;
  const previousXp = existing?.xp ?? 0;
  const bestStars = Math.max(previousStars, stars);
  const newXp = Math.max(previousXp, xpForStars(bestStars));
  const gainedXp = Math.max(0, newXp - previousXp);
  const now = new Date().toISOString();

  state.levels[levelId] = {
    stars: bestStars,
    xp: newXp,
    attempts: Math.max(existing?.attempts ?? 0, failedChecks),
    hintsUsed: Math.max(existing?.hintsUsed ?? 0, hintsUsed),
    completedAt: existing?.completedAt ?? now,
    lastPlayedAt: now,
  };
  state.lastLevel = levelId;
  persist();

  return {
    stars,
    bestStars,
    previousStars,
    gainedXp,
    newBest: bestStars > previousStars,
    totalStars: getTotalStars(),
    totalXp: getTotalXp(),
  };
}

export function resetProgress() {
  const settings = state.settings;
  const additionLab = state.additionLab;
  state = { ...freshSave(), settings, additionLab };
  persist();
}

export function resetEverything() {
  state = freshSave();
  persist();
}

// ===================== Addition Lab (independent progression) =====================

export function getAdditionLab() {
  return state.additionLab;
}

export function getExperimentRecord(experimentId) {
  return state.additionLab.results[experimentId] ?? null;
}

export function getExperimentBestStars(experimentId) {
  return getExperimentRecord(experimentId)?.stars ?? 0;
}

export function isExperimentComplete(experimentId) {
  return Boolean(getExperimentRecord(experimentId)?.completed);
}

export function isExperimentUnlocked(experimentId) {
  const index = EXPERIMENTS.findIndex((experiment) => experiment.id === experimentId);
  if (index < 0) return false;
  if (index === 0) return true;
  return isExperimentComplete(experimentId) || isExperimentComplete(EXPERIMENTS[index - 1].id);
}

export function getContinueExperimentId() {
  const next = EXPERIMENTS.find(
    (experiment) => isExperimentUnlocked(experiment.id) && !isExperimentComplete(experiment.id),
  );
  if (next) return next.id;
  const last = [...EXPERIMENTS].reverse().find((experiment) => isExperimentUnlocked(experiment.id));
  return last?.id ?? EXPERIMENTS[0].id;
}

export function getAdditionTotalStars() {
  return EXPERIMENTS.reduce((total, experiment) => total + getExperimentBestStars(experiment.id), 0);
}

export function getAdditionMaxStars() {
  return EXPERIMENTS.length * 3;
}

export function getAdditionTotalXp() {
  return EXPERIMENTS.reduce((total, experiment) => total + (getExperimentRecord(experiment.id)?.xp ?? 0), 0);
}

export function getAdditionCompletedCount() {
  return EXPERIMENTS.filter((experiment) => isExperimentComplete(experiment.id)).length;
}

export function getAdditionExperimentCount() {
  return EXPERIMENTS.length;
}

export function getAdditionZoneStars(zoneId) {
  return EXPERIMENTS.filter((experiment) => experiment.zone === zoneId).reduce(
    (total, experiment) => total + getExperimentBestStars(experiment.id),
    0,
  );
}

export function getAdditionZoneCompleted(zoneId) {
  return EXPERIMENTS.filter((experiment) => experiment.zone === zoneId && isExperimentComplete(experiment.id)).length;
}

export function markAdditionIntroSeen() {
  if (!state.additionLab.introSeen) {
    state.additionLab.introSeen = true;
    persist();
  }
}

export function markLastExperiment(experimentId) {
  if (getExperiment(experimentId)) {
    state.additionLab.lastExperiment = experimentId;
    persist();
  }
}

export function recordExperimentCompletion(experimentId, { score, stars, xp, hintsUsed = 0, attempts = 0 }) {
  const experiment = getExperiment(experimentId);
  if (!experiment) return null;

  const existing = state.additionLab.results[experimentId] ?? null;
  const previousStars = existing?.stars ?? 0;
  const previousXp = existing?.xp ?? 0;
  const previousScore = existing?.score ?? 0;
  const bestStars = Math.max(previousStars, stars);
  const bestScore = Math.max(previousScore, score);
  const newXp = Math.max(previousXp, xp);
  const gainedXp = Math.max(0, newXp - previousXp);
  const now = new Date().toISOString();

  state.additionLab.results[experimentId] = {
    completed: true,
    score: bestScore,
    stars: bestStars,
    xp: newXp,
    hintsUsed: Math.max(existing?.hintsUsed ?? 0, hintsUsed),
    attempts: Math.max(existing?.attempts ?? 0, attempts),
    completedAt: existing?.completedAt ?? now,
    lastPlayedAt: now,
  };
  state.additionLab.lastExperiment = experimentId;
  persist();

  return {
    stars,
    bestStars,
    previousStars,
    score,
    bestScore,
    gainedXp,
    newBest: bestStars > previousStars,
    totalStars: getAdditionTotalStars(),
    totalXp: getAdditionTotalXp(),
  };
}

export function resetAdditionLab() {
  state.additionLab = freshSave().additionLab;
  persist();
}
