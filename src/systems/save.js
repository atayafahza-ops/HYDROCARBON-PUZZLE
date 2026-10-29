import { LEVELS, getLevel } from '../data/levels.js';
import { xpForStars } from './score.js';

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
  // Every level is open from the start; progress only tracks stars.
  return Boolean(getLevel(levelId));
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
  state = { ...freshSave(), settings };
  persist();
}

export function resetEverything() {
  state = freshSave();
  persist();
}
