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
const PLAYER_ID_STORAGE_KEY = 'creatyxo_player_id';

/**
 * Gets or creates a persistent unique player ID for this user's account
 */
export function getPlayerId(): string {
  if (typeof window === 'undefined') return 'server-player';
  let id = localStorage.getItem(PLAYER_ID_STORAGE_KEY);
  if (!id) {
    id = `usr_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    localStorage.setItem(PLAYER_ID_STORAGE_KEY, id);
  }
  return id;
}

/**
 * Saves or updates player's record in local fallback and pushes to the shared server
 */
export async function savePlayerToLeaderboard(profile: PlayerProfile, bestScore: number): Promise<void> {
  const playerId = getPlayerId();
  const username = (profile?.username || 'Player').trim() || 'Player';
  const letter = (profile?.avatarLetter || username.charAt(0) || 'P').toUpperCase();
  const tag = profile?.tag ? profile.tag.trim() : undefined;
  const score = Math.max(0, bestScore);

  // 1. Local storage backup
  if (typeof window !== 'undefined') {
    try {
      const entry: Omit<LeaderboardEntry, 'rank' | 'isCurrentUser'> = {
        id: playerId,
        username,
        tag,
        score,
        avatarLetter: letter,
        tier: getTierFromScore(score),
      };
      localStorage.setItem(LEADERBOARD_STORAGE_KEY, JSON.stringify([entry]));
    } catch {
      // Ignore
    }
  }

  // 2. Push to shared backend database so all persons see the record!
  try {
    await fetch('/api/leaderboard/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: playerId,
        username,
        tag,
        score,
        avatarLetter: letter,
      }),
    });
  } catch {
    // Graceful offline fallback
  }
}

/**
 * Fetches the live shared leaderboard containing all players' records
 */
export async function fetchSharedLeaderboard(
  userProfile: PlayerProfile,
  userBestScore: number
): Promise<{ list: LeaderboardEntry[]; userRank: number; userEntry: LeaderboardEntry }> {
  const currentId = getPlayerId();
  const safeUsername = (userProfile?.username || 'Player').trim() || 'Player';
  const safeTag = userProfile?.tag ? userProfile.tag.trim() : undefined;
  const safeLetter = (userProfile?.avatarLetter || safeUsername.charAt(0) || 'P').toUpperCase();
  const safeScore = Math.max(0, userBestScore || 0);

  let rawEntries: Array<{
    id: string;
    username: string;
    tag?: string;
    score: number;
    avatarLetter: string;
    tier: LeaderboardEntry['tier'];
    rank: number;
  }> = [];

  try {
    const res = await fetch('/api/leaderboard');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.entries)) {
        rawEntries = data.entries;
      }
    }
  } catch {
    // Offline or server booting
  }

  // If server is fresh or user not present or has a higher score locally, ensure user is included
  const existingUserIndex = rawEntries.findIndex(
    (e) => e.id === currentId || (e.username.toLowerCase() === safeUsername.toLowerCase() && e.tag === safeTag)
  );

  if (existingUserIndex >= 0) {
    if (safeScore > rawEntries[existingUserIndex].score) {
      rawEntries[existingUserIndex].score = safeScore;
      rawEntries[existingUserIndex].tier = getTierFromScore(safeScore);
      // Trigger background sync to server
      savePlayerToLeaderboard(userProfile, safeScore).catch(() => {});
    }
  } else if (userProfile.hasChosenName || safeScore > 0) {
    // Add player to the list
    rawEntries.push({
      id: currentId,
      username: safeUsername,
      tag: safeTag,
      score: safeScore,
      avatarLetter: safeLetter,
      tier: getTierFromScore(safeScore),
      rank: 1,
    });
    // Trigger background sync to server
    savePlayerToLeaderboard(userProfile, safeScore).catch(() => {});
  }

  // Re-sort by score descending
  rawEntries.sort((a, b) => b.score - a.score);

  // Map into LeaderboardEntry with ranks and currentUser flags
  let userRank = 1;
  let userEntry: LeaderboardEntry = {
    id: currentId,
    rank: 1,
    username: safeUsername,
    tag: safeTag,
    score: safeScore,
    avatarLetter: safeLetter,
    tier: getTierFromScore(safeScore),
    isCurrentUser: true,
  };

  const list: LeaderboardEntry[] = rawEntries.map((e, idx) => {
    const isUser = e.id === currentId || (e.username.toLowerCase() === safeUsername.toLowerCase() && e.tag === safeTag);
    const entryItem: LeaderboardEntry = {
      ...e,
      rank: idx + 1,
      isCurrentUser: isUser,
    };
    if (isUser) {
      userRank = idx + 1;
      userEntry = entryItem;
    }
    return entryItem;
  });

  if (list.length === 0) {
    list.push(userEntry);
  }

  return { list, userRank, userEntry };
}

/**
 * Builds synchronous fallback leaderboard while async shared fetch is resolving
 */
export function buildLeaderboard(
  userProfile: PlayerProfile,
  userBestScore: number
): { list: LeaderboardEntry[]; userRank: number; userEntry: LeaderboardEntry } {
  const currentId = getPlayerId();
  const safeUsername = (userProfile?.username || 'Player').trim() || 'Player';
  const safeTag = userProfile?.tag ? userProfile.tag.trim() : undefined;
  const safeLetter = (userProfile?.avatarLetter || safeUsername.charAt(0) || 'P').toUpperCase();
  const safeScore = Math.max(0, userBestScore || 0);

  const userEntry: LeaderboardEntry = {
    id: currentId,
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
