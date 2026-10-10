/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface PlayerProfile {
  username: string;
  tag?: string; // only present if rolled
  avatarLetter: string; // single-letter monogram
  hasChosenName: boolean;
}

export interface LeaderboardEntry {
  id: string;
  rank: number;
  username: string;
  tag?: string;
  score: number;
  avatarLetter: string;
  tier: 'Grandmaster' | 'Master' | 'Diamond' | 'Platinum' | 'Gold' | 'Silver' | 'Bronze';
  isCurrentUser?: boolean;
}

const NAME_PREFIXES = [
  'Cyber', 'Neon', 'Pixel', 'Quantum', 'Vortex', 'Hyper', 'Aero', 'Glitch',
  'Shadow', 'Solar', 'Turbo', 'Sonic', 'Blaze', 'Phantom', 'Omega', 'Cosmic',
  'Nova', 'Vector', 'Apex', 'Laser', 'Pulse', 'Aura', 'Rogue', 'Titan', 'Echo'
];

const NAME_SUFFIXES = [
  'Striker', 'Rider', 'Blade', 'Knight', 'Fox', 'Ghost', 'Hunter', 'Sniper',
  'Wolf', 'Master', 'Pilot', 'Viper', 'Spark', 'Drifter', 'Claw', 'Reaper',
  'Fury', 'Samurai', 'Runner', 'Wanderer', 'Ace', 'Ninja', 'Raven'
];

/**
 * Generates a fun randomized name WITH a number tag.
 * Numbers only appear when rolling! Custom names don't have numbers.
 */
export function generateRandomName(): { username: string; tag: string } {
  const prefix = NAME_PREFIXES[Math.floor(Math.random() * NAME_PREFIXES.length)];
  const suffix = NAME_SUFFIXES[Math.floor(Math.random() * NAME_SUFFIXES.length)];
  const tag = Math.floor(1000 + Math.random() * 9000).toString();
  return { username: `${prefix}${suffix}`, tag };
}

export function getTierFromScore(score: number): LeaderboardEntry['tier'] {
  if (score >= 15000) return 'Grandmaster';
  if (score >= 10000) return 'Master';
  if (score >= 6000) return 'Diamond';
  if (score >= 3500) return 'Platinum';
  if (score >= 2000) return 'Gold';
  if (score >= 800) return 'Silver';
  return 'Bronze';
}

export function getTierBadgeStyle(tier: LeaderboardEntry['tier']): {
  bg: string;
  text: string;
  border: string;
} {
  switch (tier) {
    case 'Grandmaster':
      return { bg: 'bg-rose-950/40', text: 'text-rose-400', border: 'border-rose-500/30' };
    case 'Master':
      return { bg: 'bg-purple-950/40', text: 'text-purple-300', border: 'border-purple-500/30' };
    case 'Diamond':
      return { bg: 'bg-cyan-950/40', text: 'text-cyan-300', border: 'border-cyan-400/30' };
    case 'Platinum':
      return { bg: 'bg-emerald-950/40', text: 'text-emerald-300', border: 'border-emerald-500/30' };
    case 'Gold':
      return { bg: 'bg-amber-950/40', text: 'text-amber-300', border: 'border-amber-400/30' };
    case 'Silver':
      return { bg: 'bg-slate-800/40', text: 'text-slate-300', border: 'border-slate-500/30' };
    case 'Bronze':
    default:
      return { bg: 'bg-slate-900', text: 'text-slate-400', border: 'border-slate-700' };
  }
}

const LEADERBOARD_STORAGE_KEY = 'creatyxo_confirmed_leaderboard';

/**
 * Saves or renames the single player account in persistent storage.
 * You cannot create duplicate accounts — changing name updates your one account.
 */
export function savePlayerToLeaderboard(profile: PlayerProfile, bestScore: number) {
  if (typeof window === 'undefined') return;
  try {
    const username = (profile?.username || 'Player').trim();
    if (!username) return;

    const letter = (profile?.avatarLetter || username.charAt(0) || 'P').toUpperCase();
    const tag = profile?.tag ? profile.tag.trim() : undefined;

    const entry: Omit<LeaderboardEntry, 'rank' | 'isCurrentUser'> = {
      id: 'player-profile',
      username,
      tag,
      score: Math.max(0, bestScore),
      avatarLetter: letter,
      tier: getTierFromScore(bestScore),
    };

    localStorage.setItem(LEADERBOARD_STORAGE_KEY, JSON.stringify([entry]));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Builds the player's leaderboard entry.
 * Guaranteed to never crash and shows your active profile and record.
 */
export function buildLeaderboard(
  userProfile: PlayerProfile,
  userBestScore: number
): { list: LeaderboardEntry[]; userRank: number; userEntry: LeaderboardEntry } {
  const safeUsername = (userProfile?.username || 'Player').trim() || 'Player';
  const safeTag = userProfile?.tag ? userProfile.tag.trim() : undefined;
  const safeLetter = (userProfile?.avatarLetter || safeUsername.charAt(0) || 'P').toUpperCase();
  const safeScore = Math.max(0, userBestScore || 0);

  const userEntry: LeaderboardEntry = {
    id: 'player-profile',
    rank: 1,
    username: safeUsername,
    tag: safeTag,
    score: safeScore,
    avatarLetter: safeLetter,
    tier: getTierFromScore(safeScore),
    isCurrentUser: true,
  };

  return {
    list: [userEntry],
    userRank: 1,
    userEntry,
  };
}
