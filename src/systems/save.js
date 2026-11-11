import { LEVELS, getLevel } from '../data/levels.js';
import { xpForStars } from './score.js';
import {
  PLAYABLE_EXPERIMENTS,
  getExperiment,
  isExperimentPlayable,
} from '../additionLab/data/experiments.js';

const STORAGE_KEY = 'carbon-code-save-v1';

const freshAdditionLab = () => ({
  results: {},
  lastExperiment: null,
  introSeen: false,
});

const freshSave = () => ({
  version: 1,
  levels: {},
  lastLevel: 1,
  introSeen: false,
  additionLab: freshAdditionLab(),
  settings: {
    sfx: true,
    reducedMotion: false,
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

function sanitizeAdditionResults(results) {
  if (!results || typeof results !== 'object') return {};
  const clean = {};
  for (const [key, value] of Object.entries(results)) {
    if (!isExperimentPlayable(key) || !value || typeof value !== 'object') continue;
    clean[key] = {
      stars: Math.max(0, Math.min(3, Number(value.stars) || 0)),
      xp: Math.max(0, Number(value.xp) || 0),
      score: Math.max(0, Math.min(100, Number(value.score) || 0)),
      attempts: Math.max(0, Number(value.attempts) || 0),
      hintsUsed: Math.max(0, Number(value.hintsUsed) || 0),
      completedAt: value.completedAt ?? null,
      lastPlayedAt: value.lastPlayedAt ?? null,
    };
  }
  return clean;
}

function sanitizeAdditionLab(additionLab) {
  if (!additionLab || typeof additionLab !== 'object') return freshAdditionLab();
  return {
    results: sanitizeAdditionResults(additionLab.results),
    lastExperiment: isExperimentPlayable(additionLab.lastExperiment) ? additionLab.lastExperiment : null,
    introSeen: Boolean(additionLab.introSeen),
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
    additionLab: sanitizeAdditionLab(stored.additionLab),
    settings: {
      ...base.settings,
      ...(stored.settings && typeof stored.settings === 'object' ? stored.settings : {}),
    },
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

export function getAdditionLab() {
  return state.additionLab;
}

export function markAdditionIntroSeen() {
  if (!state.additionLab.introSeen) {
    state.additionLab.introSeen = true;
    persist();
  }
}

export function getExperimentRecord(experimentId) {
  return state.additionLab.results[experimentId] ?? null;
}

export function getExperimentBestStars(experimentId) {
  return getExperimentRecord(experimentId)?.stars ?? 0;
}

export function isExperimentUnlocked(experimentId) {
  const experiment = getExperiment(experimentId);
  if (!experiment || !isExperimentPlayable(experimentId)) return false;
  if (getExperimentBestStars(experimentId) > 0) return true;
  const zoneExps = PLAYABLE_EXPERIMENTS.filter((entry) => entry.zone === experiment.zone);
  const index = zoneExps.findIndex((entry) => entry.id === experimentId);
  const precedingCore = zoneExps.slice(0, index).filter((entry) => entry.level === 'core');
  return precedingCore.every((entry) => getExperimentBestStars(entry.id) > 0);
}

export function recordExperimentCompletion(experimentId, { stars, hintsUsed = 0, xp = 0, attempts = 1, score = 0 }) {
  const experiment = getExperiment(experimentId);
  if (!experiment || !isExperimentPlayable(experimentId)) return null;

  const existing = state.additionLab.results[experimentId] ?? null;
  const previousStars = existing?.stars ?? 0;
  const previousXp = existing?.xp ?? 0;
  const previousScore = existing?.score ?? 0;
  const bestStars = Math.max(previousStars, Math.max(0, Math.min(3, Number(stars) || 0)));
  const newXp = Math.max(previousXp, Math.max(0, Number(xp) || 0));
  const bestScore = Math.max(previousScore, Math.max(0, Math.min(100, Number(score) || 0)));
  const gainedXp = Math.max(0, newXp - previousXp);
  const now = new Date().toISOString();

  state.additionLab.results[experimentId] = {
    stars: bestStars,
    xp: newXp,
    score: bestScore,
    attempts: Math.max(existing?.attempts ?? 0, Math.max(0, Number(attempts) || 1)),
    hintsUsed: Math.max(existing?.hintsUsed ?? 0, Math.max(0, Number(hintsUsed) || 0)),
    completedAt: existing?.completedAt ?? now,
    lastPlayedAt: now,
  };
  state.additionLab.lastExperiment = experimentId;
  persist();

  return {
    stars,
    bestStars,
    previousStars,
    gainedXp,
    newBest: bestStars > previousStars,
    totalStars: getAdditionTotalStars(),
    totalXp: getAdditionTotalXp(),
  };
}

export function isExperimentComplete(experimentId) {
  return isExperimentUnlocked(experimentId) && getExperimentBestStars(experimentId) > 0;
}

export function markLastExperiment(experimentId) {
  if (!isExperimentPlayable(experimentId)) return;
  state.additionLab.lastExperiment = experimentId;
  persist();
}

export function getContinueExperimentId() {
  const nextIncomplete = PLAYABLE_EXPERIMENTS.find(
    (entry) => isExperimentUnlocked(entry.id) && getExperimentBestStars(entry.id) === 0,
  );
  if (nextIncomplete) return nextIncomplete.id;
  const lastUnlocked = [...PLAYABLE_EXPERIMENTS].reverse().find((entry) => isExperimentUnlocked(entry.id));
  return lastUnlocked?.id ?? PLAYABLE_EXPERIMENTS[0]?.id ?? null;
}

export function getAdditionTotalStars() {
  return PLAYABLE_EXPERIMENTS.reduce((total, entry) => total + getExperimentBestStars(entry.id), 0);
}

export function getAdditionMaxStars() {
  return PLAYABLE_EXPERIMENTS.length * 3;
}

export function getAdditionTotalXp() {
  return PLAYABLE_EXPERIMENTS.reduce((total, entry) => total + (getExperimentRecord(entry.id)?.xp ?? 0), 0);
}

export function getAdditionCompletedCount() {
  return PLAYABLE_EXPERIMENTS.filter((entry) => getExperimentBestStars(entry.id) > 0).length;
}

export function getAdditionExperimentCount() {
  return PLAYABLE_EXPERIMENTS.length;
}

export function getAdditionZoneExperiments(zoneId) {
  return PLAYABLE_EXPERIMENTS.filter((entry) => entry.zone === zoneId);
}

export function getAdditionZoneStars(zoneId) {
  return getAdditionZoneExperiments(zoneId).reduce((total, entry) => total + getExperimentBestStars(entry.id), 0);
}

export function getAdditionZoneMaxStars(zoneId) {
  return getAdditionZoneExperiments(zoneId).length * 3;
}

export function getAdditionZoneCompleted(zoneId) {
  return getAdditionZoneExperiments(zoneId).filter((entry) => getExperimentBestStars(entry.id) > 0).length;
}

export function resetAdditionLab() {
  state.additionLab = freshAdditionLab();
  persist();
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
