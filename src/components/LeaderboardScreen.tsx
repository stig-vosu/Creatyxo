/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  PlayerProfile,
  LeaderboardEntry,
  buildLeaderboard,
  fetchSharedLeaderboard,
  subscribeToLeaderboardUpdates,
  getTierBadgeStyle,
} from '../game/leaderboard';

interface LeaderboardScreenProps {
  playerProfile: PlayerProfile;
  bestScore: number;
  onBack: () => void;
  onPlayGame: () => void;
  onOpenNameModal?: () => void;
}

export const LeaderboardScreen: React.FC<LeaderboardScreenProps> = ({
  playerProfile,
  bestScore,
  onBack,
  onPlayGame,
  onOpenNameModal,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Synchronous initial fallback so UI renders instantaneously
  const [leaderboardData, setLeaderboardData] = useState(() => {
    return buildLeaderboard(playerProfile, bestScore);
  });

  const refreshSharedBoard = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const data = await fetchSharedLeaderboard(playerProfile, bestScore);
      setLeaderboardData(data);
    } catch {
      // Keep existing data
    } finally {
      setIsRefreshing(false);
    }
  }, [playerProfile, bestScore]);

  // Fetch live shared leaderboard on mount and subscribe to real-time updates
  useEffect(() => {
    refreshSharedBoard();
    const unsubscribe = subscribeToLeaderboardUpdates(() => {
      refreshSharedBoard();
    });
    return () => {
      unsubscribe();
    };
  }, [refreshSharedBoard]);

  const { list, userRank, userEntry } = leaderboardData;

  // Filter list by username or tag
  const filteredList = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return list;
    return list.filter((player) => {
      const matchName = (player.username || '').toLowerCase().includes(q);
      const matchTag = player.tag ? player.tag.toLowerCase().includes(q) : false;
      const full = `${player.username || ''}${player.tag ? `#${player.tag}` : ''}`.toLowerCase();
      return matchName || matchTag || full.includes(q);
    });
  }, [list, searchQuery]);

  return (
    <div className="w-full h-full flex flex-col overflow-hidden select-none animate-fadeIn">
      {/* 1. Header (Fixed top, never shrinks) */}
      <header className="shrink-0 flex items-center justify-between pb-2 border-b border-[#141d30]">
        <button
          type="button"
          onClick={onBack}
          className="px-3 py-1.5 rounded-xl bg-[#121828] border border-[#1d273f] text-slate-300 hover:text-white hover:border-[#3debe0]/50 text-xs font-bold tracking-wider font-['Orbitron',sans-serif] active:scale-95 transition-all cursor-pointer"
        >
          BACK
        </button>

        <div className="flex flex-col items-center">
          <div className="flex items-center gap-1.5">
            <h2 className="text-sm font-bold text-white font-['Orbitron',sans-serif] tracking-wider text-center">
              LEADERBOARD
            </h2>
            <button
              type="button"
              onClick={refreshSharedBoard}
              title="Refresh shared records"
              className="text-[#3debe0] hover:text-white p-1 rounded transition-colors cursor-pointer"
            >
              <svg className={`w-3 h-3 fill-current ${isRefreshing ? 'animate-spin' : ''}`} viewBox="0 0 24 24">
                <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z" />
              </svg>
            </button>
          </div>
          <span className="text-[8px] font-bold tracking-widest text-emerald-400 font-['Orbitron',sans-serif] flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            LIVE SHARED ({list.length} {list.length === 1 ? 'PLAYER' : 'PLAYERS'})
          </span>
        </div>

        {onOpenNameModal ? (
          <button
            type="button"
            onClick={onOpenNameModal}
            className="text-[10px] text-[#3debe0] hover:text-white font-bold tracking-wider font-['Orbitron',sans-serif] cursor-pointer"
            title="Change your player name"
          >
            CHANGE NAME
          </button>
        ) : (
          <div className="w-16" />
        )}
      </header>

      {/* 2. Your Rank Summary Card (Fixed, never shrinks) */}
      <div className="shrink-0 my-2 p-2.5 rounded-xl bg-[#0e1628] border border-[#3debe0]/40 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-[#16233a] border border-[#233554] text-[#3debe0] font-black text-xs flex items-center justify-center font-['Orbitron',sans-serif]">
            {userEntry.avatarLetter}
          </div>

          <div className="flex flex-col text-left">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-white font-['Orbitron',sans-serif]">
                {userEntry.username}
              </span>
              {userEntry.tag && (
                <span className="text-[10px] text-slate-500 font-mono">
                  #{userEntry.tag}
                </span>
              )}
              <span className="text-[8px] font-bold px-1.5 py-0.2 rounded bg-[#3debe0]/20 text-[#3debe0] border border-[#3debe0]/30 font-['Orbitron',sans-serif]">
                YOU
              </span>
            </div>

            <span className="text-[10px] text-slate-400 font-['Orbitron',sans-serif] mt-0.5">
              BEST: <strong className="text-[#f6c445] font-black">{userEntry.score.toLocaleString()}</strong>
            </span>
          </div>
        </div>

        <div className="flex flex-col items-end">
          <span className="text-[9px] font-bold text-slate-400 font-['Orbitron',sans-serif]">
            RANK
          </span>
          <span className="text-lg font-black text-[#3debe0] font-['Orbitron',sans-serif]">
            #{userRank}
          </span>
        </div>
      </div>

      {/* 3. Search Bar */}
      <div className="shrink-0 mb-2 relative">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search player name..."
          className="w-full bg-[#101625] border border-[#1d273f] rounded-xl px-3.5 py-2 text-xs font-bold text-white font-['Orbitron',sans-serif] focus:outline-none focus:border-[#3debe0]/60 placeholder:text-slate-600 placeholder:font-normal"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white text-[10px] font-bold cursor-pointer"
          >
            CLEAR
          </button>
        )}
      </div>

      {/* 4. Scrollable List with Themed Scrollbar */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5 pr-1.5 custom-scrollbar">
        {filteredList.length === 0 ? (
          <div className="py-6 flex flex-col items-center justify-center text-slate-400 gap-1.5 text-center">
            <span className="text-xs font-bold font-['Orbitron',sans-serif]">
              No player found matching "{searchQuery}"
            </span>
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="text-[10px] text-[#3debe0] hover:underline font-bold cursor-pointer"
            >
              Reset Search
            </button>
          </div>
        ) : (
          filteredList.map((player) => {
            const tierStyle = getTierBadgeStyle(player.tier);
            const isUser = player.isCurrentUser;

            return (
              <div
                key={player.id}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl transition-all ${
                  isUser
                    ? 'bg-[#121f35] border border-[#3debe0]/60'
                    : 'bg-[#0d1322] border border-[#162035]'
                }`}
              >
                {/* Left: Rank & Player Info */}
                <div className="flex items-center gap-2.5 min-w-0">
                  {/* Clean Rank Number */}
                  <div
                    className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-black font-['Orbitron',sans-serif] shrink-0 ${
                      player.rank === 1
                        ? 'bg-[#f6c445]/20 text-[#f6c445] border border-[#f6c445]/40'
                        : 'bg-[#141b2e] text-slate-400'
                    }`}
                  >
                    #{player.rank}
                  </div>

                  {/* Monogram */}
                  <div className="w-6 h-6 rounded-md bg-[#141d30] border border-[#1f2d47] text-slate-300 text-[10px] font-bold flex items-center justify-center shrink-0">
                    {player.avatarLetter}
                  </div>

                  {/* Name and Tag */}
                  <div className="flex flex-col min-w-0 text-left">
                    <div className="flex items-center gap-1.5 truncate">
                      <span
                        className={`text-xs font-bold truncate font-['Orbitron',sans-serif] ${
                          isUser ? 'text-[#3debe0]' : 'text-slate-100'
                        }`}
                      >
                        {player.username}
                      </span>
                      {player.tag && (
                        <span className="text-[10px] text-slate-500 font-mono shrink-0">
                          #{player.tag}
                        </span>
                      )}
                    </div>

                    <span
                      className={`text-[8px] font-bold px-1.5 py-0.2 rounded-full border self-start ${tierStyle.bg} ${tierStyle.text} ${tierStyle.border} font-['Orbitron',sans-serif]`}
                    >
                      {player.tier}
                    </span>
                  </div>
                </div>

                {/* Right: Score */}
                <div className="flex flex-col items-end shrink-0 pl-2">
                  <span
                    className={`text-xs font-black font-['Orbitron',sans-serif] ${
                      isUser ? 'text-[#3debe0]' : 'text-[#f6c445]'
                    }`}
                  >
                    {player.score.toLocaleString()}
                  </span>
                  <span className="text-[7px] text-slate-500 font-['Orbitron',sans-serif] tracking-wider">
                    BEST SCORE
                  </span>
                </div>
              </div>
            );
          })
        )}

        {/* Clean explanatory card */}
        <div className="p-3 rounded-xl bg-[#0e1628]/50 border border-[#1b263d] text-center my-2">
          <span className="text-[10px] text-emerald-400 font-bold font-['Orbitron',sans-serif] block">
            GLOBAL LIVE LEADERBOARD
          </span>
          <span className="text-[9px] text-slate-400 font-['Orbitron',sans-serif] mt-0.5 block">
            Shared across all players & devices. Every player's record is automatically synced here.
          </span>
        </div>
      </div>

      {/* 5. Fixed Bottom Footer */}
      <footer className="shrink-0 pt-2 pb-1 border-t border-[#141d30] mt-auto">
        <button
          type="button"
          onClick={onPlayGame}
          className="w-full py-3 rounded-xl bg-[#3debe0] hover:bg-[#34d1c6] text-[#070a11] font-black tracking-widest text-xs font-['Orbitron',sans-serif] active:scale-95 transition-all shadow-md cursor-pointer"
        >
          PLAY NOW
        </button>
      </footer>
    </div>
  );
};
