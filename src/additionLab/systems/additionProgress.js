import {
  getAdditionTotalXp,
  getAdditionCompletedCount,
  getAdditionTotalStars,
  getExperimentRecord,
  isExperimentComplete,
} from '../../systems/save.js';
import { PLAYABLE_EXPERIMENTS } from '../data/experiments.js';
import { ZONES } from '../data/zones.js';

export const RANKS = [
  { id: 'junior', name: 'Junior Researcher', minXp: 0, icon: 'flask' },
  { id: 'assistant', name: 'Laboratory Assistant', minXp: 300, icon: 'atom' },
  { id: 'analyst', name: 'Reaction Analyst', minXp: 900, icon: 'target' },
  { id: 'senior', name: 'Senior Researcher', minXp: 1800, icon: 'spark' },
  { id: 'master', name: 'Master Chemist', minXp: 3000, icon: 'crown' },
];

export function getRank(xp = getAdditionTotalXp()) {
  let current = RANKS[0];
  for (const rank of RANKS) {
    if (xp >= rank.minXp) current = rank;
  }
  return current;
}

export function getNextRank(xp = getAdditionTotalXp()) {
  return RANKS.find((rank) => rank.minXp > xp) ?? null;
}

export function getRankProgress(xp = getAdditionTotalXp()) {
  const current = getRank(xp);
  const next = getNextRank(xp);
  if (!next) return { current, next: null, percent: 100, into: xp - current.minXp, span: 0 };
  const span = next.minXp - current.minXp;
  const into = xp - current.minXp;
  return { current, next, percent: Math.round((into / span) * 100), into, span };
}

export const ACHIEVEMENTS = [
  {
    id: 'first-reaction',
    name: 'Reaksi Pertama',
    description: 'Selesaikan eksperimen pertamamu.',
    icon: 'spark',
    test: () => getAdditionCompletedCount() >= 1,
  },
  {
    id: 'perfect-run',
    name: 'Presisi Sempurna',
    description: 'Raih skor 100 pada satu eksperimen.',
    icon: 'target',
    test: () => PLAYABLE_EXPERIMENTS.some((experiment) => (getExperimentRecord(experiment.id)?.score ?? 0) >= 100),
  },
  {
    id: 'no-hints',
    name: 'Tanpa Bantuan',
    description: 'Selesaikan satu eksperimen tanpa petunjuk.',
    icon: 'bulb',
    test: () => PLAYABLE_EXPERIMENTS.some((experiment) => {
      const record = getExperimentRecord(experiment.id);
      return record?.completedAt && record.hintsUsed === 0;
    }),
  },
  {
    id: 'zone-master',
    name: 'Spesialis Zona',
    description: 'Selesaikan semua eksperimen dalam satu zona.',
    icon: 'database',
    test: () => ZONES.some((zone) => {
      const experiments = PLAYABLE_EXPERIMENTS.filter((experiment) => experiment.zone === zone.id);
      return experiments.length > 0 && experiments.every((experiment) => isExperimentComplete(experiment.id));
    }),
  },
  {
    id: 'star-collector',
    name: 'Kolektor Bintang',
    description: 'Kumpulkan 60 bintang di Addition Lab.',
    icon: 'trophy',
    test: () => getAdditionTotalStars() >= 60,
  },
  {
    id: 'half-archive',
    name: 'Setengah Arsip',
    description: 'Selesaikan 20 eksperimen.',
    icon: 'book',
    test: () => getAdditionCompletedCount() >= 20,
  },
  {
    id: 'master-chemist',
    name: 'Master Chemist',
    description: 'Selesaikan seluruh 38 eksperimen.',
    icon: 'crown',
    test: () => getAdditionCompletedCount() >= PLAYABLE_EXPERIMENTS.length,
  },
];

export function getAchievements() {
  return ACHIEVEMENTS.map((achievement) => ({
    ...achievement,
    unlocked: achievement.test(),
  }));
}

export function getUnlockedAchievementCount() {
  return getAchievements().filter((achievement) => achievement.unlocked).length;
}