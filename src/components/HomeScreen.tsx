/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { PlayerProfile, getTierFromScore, getTierBadgeStyle } from '../game/leaderboard';

interface HomeScreenProps {
  playerProfile: PlayerProfile;
  bestScore: number;
  userRank: number;
  soundEnabled: boolean;
  musicEnabled: boolean;
  onToggleSound: () => void;
  onToggleMusic: () => void;
  onOpenAudioSettings: () => void;
  onStartGame: () => void;
  onOpenLeaderboard: () => void;
  onOpenNameModal: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  playerProfile,
  bestScore,
  userRank,
  soundEnabled,
  musicEnabled,
  onToggleSound,
  onToggleMusic,
  onOpenAudioSettings,
  onStartGame,
  onOpenLeaderboard,
  onOpenNameModal,
}) => {
  const tier = getTierFromScore(bestScore);
  const tierStyle = getTierBadgeStyle(tier);
  const initial = (playerProfile.avatarLetter || playerProfile.username.charAt(0) || 'P').toUpperCase();

  return (
    <div className="w-full h-full flex flex-col justify-between items-center text-center select-none animate-fadeIn">
      {/* Top Header Bar: Corner buttons have explicit 10px margins from screen border and >=4px from neighbors */}
      <header className="w-full flex items-center justify-between px-2 sm:px-3 pt-1">
        {/* Player Profile Chip (Top Left Corner: 10px margin from top/left border, 4px from neighbors) */}
        <button
          type="button"
          onClick={onOpenNameModal}
          style={{ marginLeft: 10, marginTop: 10, marginRight: 4, marginBottom: 4 }}
          className="btn-creatyxo rounded-xl bg-[#101625] border border-[#1b263d] hover:border-[#3debe0]/50 transition-all cursor-pointer group active:scale-95 shadow-sm gap-2.5 max-w-[70%]"
          title="Click to edit player name"
        >
          {/* Monogram Circle */}
          <div className="w-7 h-7 rounded-lg bg-[#172238] border border-[#233250] text-[#3debe0] font-black text-xs flex items-center justify-center text-center font-['Orbitron',sans-serif] shrink-0">
            {initial}
          </div>

          <div className="flex flex-col text-left justify-center min-w-0 pr-1 gap-1">
            <div className="flex items-center gap-1.5 truncate">
              <span className="text-xs font-bold text-white font-['Orbitron',sans-serif] group-hover:text-[#3debe0] transition-colors truncate leading-normal">
                {playerProfile.username}
              </span>
              {playerProfile.tag && (
                <span className="text-[10px] text-slate-500 font-mono shrink-0">
                  #{playerProfile.tag}
                </span>
              )}
            </div>
            <span className="text-[8.5px] text-slate-400 font-['Orbitron',sans-serif] tracking-wider leading-normal mt-1">
              EDIT NAME
            </span>
          </div>
        </button>

        {/* Settings Button (Top Right Corner: 10px margin from top/right border, 4px from neighbors) */}
        <button
          type="button"
          onClick={onOpenAudioSettings}
          style={{
            padding: 8,
            marginLeft: 4,
            marginRight: 10,
            marginTop: 10,
            marginBottom: 4,
          }}
          className="btn-creatyxo-icon rounded-xl border border-[#1b263d] bg-[#101625] text-slate-400 hover:text-[#3debe0] hover:border-[#3debe0]/50 cursor-pointer active:scale-95 transition-all shadow-sm shrink-0"
          aria-label="Settings, Sound & Music"
          title="Settings (Music & Sound)"
        >
          <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
            <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
          </svg>
        </button>
      </header>

      {/* Central Branding with balanced spatial margins */}
      <div className="flex flex-col items-center gap-5 my-auto py-3">
        {/* Title */}
        <div className="flex flex-col items-center gap-1.5">
          <h1 className="text-4xl sm:text-5xl font-black text-[#3debe0] font-['Black_Ops_One',sans-serif] tracking-wider drop-shadow-[0_0_18px_rgba(61,235,224,0.38)] leading-tight text-center">
            CREATYXO
          </h1>
          <p className="text-[10px] font-bold tracking-[0.28em] text-slate-400 font-['Orbitron',sans-serif] uppercase leading-normal mt-1 text-center">
            BLOCK PUZZLE
          </p>
        </div>

        {/* Clean Score Card with >=4px distance */}
        <div className="w-full max-w-[320px] bg-[#0c1220] border border-[#1b263d] rounded-2xl px-5 py-3.5 flex items-center justify-between shadow-sm min-h-[66px]">
          <div className="flex flex-col text-left justify-center gap-1">
            <span className="text-[10px] font-bold text-slate-400 font-['Orbitron',sans-serif] tracking-wider leading-normal">
              BEST SCORE
            </span>
            <span className="text-xl sm:text-2xl font-black text-[#f6c445] font-['Orbitron',sans-serif] mt-1 leading-normal">
              {bestScore.toLocaleString()}
            </span>
          </div>

          <div className="flex flex-col items-end justify-center gap-1">
            <span className="text-[10px] font-bold text-slate-400 font-['Orbitron',sans-serif] tracking-wider leading-normal">
              RANK
            </span>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm font-black text-white font-['Orbitron',sans-serif] leading-normal">
                #{userRank}
              </span>
              <span
                className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${tierStyle.bg} ${tierStyle.text} ${tierStyle.border} font-['Orbitron',sans-serif] leading-normal`}
              >
                {tier}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Spacious Main Action Buttons: Inset 10px from border, 12px gap between buttons */}
      <div className="w-full max-w-[320px] sm:max-w-[340px] px-3 sm:px-4 flex flex-col gap-3 mb-2.5">
        {/* PRIMARY: JUMP INTO THE GAME */}
        <button
          type="button"
          onClick={onStartGame}
          className="btn-creatyxo w-full rounded-2xl bg-[#3debe0] hover:bg-[#34d1c6] text-[#070a11] font-black tracking-widest text-xs sm:text-sm font-['Orbitron',sans-serif] shadow-[0_0_24px_rgba(61,235,224,0.38)] active:scale-95 transition-all cursor-pointer m-1"
        >
          JUMP INTO THE GAME
        </button>

        {/* SECONDARY: LEADERBOARD */}
        <button
          type="button"
          onClick={onOpenLeaderboard}
          className="btn-creatyxo w-full rounded-xl bg-[#121828] border border-[#1d273f] hover:border-[#3debe0]/40 text-slate-200 hover:text-white font-bold tracking-wider text-xs font-['Orbitron',sans-serif] hover:bg-[#161f33] active:scale-95 transition-all cursor-pointer m-1"
        >
          LEADERBOARD
        </button>
      </div>

      {/* Clean quiet footer: at least 10px from screen bottom border */}
      <footer className="text-[9px] text-slate-600 font-['Orbitron',sans-serif] tracking-widest uppercase pb-2.5 mb-2.5 leading-normal">
        Match Rows & Columns
      </footer>
    </div>
  );
};
