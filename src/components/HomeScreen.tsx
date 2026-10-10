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
  onOpenTutorial: () => void;
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
  onOpenTutorial,
}) => {
  const tier = getTierFromScore(bestScore);
  const tierStyle = getTierBadgeStyle(tier);
  const initial = (playerProfile.avatarLetter || playerProfile.username.charAt(0) || 'P').toUpperCase();

  return (
    <div className="w-full h-full flex flex-col justify-between items-center text-center px-4 py-6 select-none animate-fadeIn">
      {/* Top Header Bar */}
      <header className="w-full flex items-center justify-between">
        {/* Player Profile Chip */}
        <button
          type="button"
          onClick={onOpenNameModal}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#101625] border border-[#1b263d] hover:border-[#3debe0]/50 transition-all cursor-pointer group active:scale-95 shadow-sm"
          title="Click to edit player name"
        >
          {/* Monogram Circle */}
          <div className="w-7 h-7 rounded-lg bg-[#172238] border border-[#233250] text-[#3debe0] font-black text-xs flex items-center justify-center font-['Orbitron',sans-serif]">
            {initial}
          </div>

          <div className="flex flex-col text-left">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-white font-['Orbitron',sans-serif] group-hover:text-[#3debe0] transition-colors">
                {playerProfile.username}
              </span>
              {playerProfile.tag && (
                <span className="text-[10px] text-slate-500 font-mono">
                  #{playerProfile.tag}
                </span>
              )}
            </div>
            <span className="text-[9px] text-slate-400 font-['Orbitron',sans-serif] tracking-wider">
              EDIT NAME
            </span>
          </div>
        </button>

        {/* Audio Controls Group: Sliders, Music & SFX */}
        <div className="flex items-center gap-1.5">
          {/* Audio Loudness Settings Modal Button */}
          <button
            type="button"
            onClick={onOpenAudioSettings}
            className="w-9 h-9 rounded-xl border border-[#1b263d] bg-[#101625] text-slate-400 hover:text-[#3debe0] hover:border-[#3debe0]/50 flex items-center justify-center cursor-pointer active:scale-95 transition-all shadow-sm"
            aria-label="Adjust sound and music volume"
            title="Adjust Sound & Music Loudness"
          >
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z" />
            </svg>
          </button>

          {/* Music Toggle (Ambient Lo-Fi Synth) */}
          <button
            type="button"
            onClick={onToggleMusic}
            className={`w-9 h-9 rounded-xl border flex items-center justify-center cursor-pointer active:scale-95 transition-all shadow-sm ${
              musicEnabled
                ? 'bg-[#101625] border-[#3debe0]/50 text-[#3debe0]'
                : 'bg-[#101625] border-[#1b263d] text-slate-500'
            }`}
            aria-label="Toggle background music"
            title={musicEnabled ? 'Chill Music: ON' : 'Chill Music: OFF'}
          >
            {/* Music Note SVG */}
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
            </svg>
          </button>

          {/* Sound Effects Toggle */}
          <button
            type="button"
            onClick={onToggleSound}
            className={`w-9 h-9 rounded-xl border flex items-center justify-center cursor-pointer active:scale-95 transition-all shadow-sm ${
              soundEnabled
                ? 'bg-[#101625] border-[#3debe0]/50 text-[#3debe0]'
                : 'bg-[#101625] border-[#1b263d] text-slate-500'
            }`}
            aria-label="Toggle sound effects"
            title={soundEnabled ? 'SFX: ON' : 'SFX: OFF'}
          >
            {soundEnabled ? (
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M14 3.23v17.54a1 1 0 0 1-1.6.8L6.7 16H3a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1h3.7l5.7-5.57a1 1 0 0 1 1.6.8zm4.5 5.27a1 1 0 0 1 1.41.09A7.95 7.95 0 0 1 22 12c0 2.22-.9 4.23-2.35 5.68a1 1 0 1 1-1.42-1.41A5.96 5.96 0 0 0 20 12c0-1.66-.67-3.17-1.76-4.27a1 1 0 0 1 .26-1.23z" />
              </svg>
            ) : (
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27l4.73 4.73H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
              </svg>
            )}
          </button>
        </div>
      </header>

      {/* Central Branding with ample whitespace */}
      <div className="flex flex-col items-center gap-5 my-auto py-4">
        {/* Title */}
        <div className="flex flex-col items-center gap-1.5">
          <h1 className="text-4xl sm:text-5xl font-black text-[#3debe0] font-['Black_Ops_One',sans-serif] tracking-wider drop-shadow-[0_0_16px_rgba(61,235,224,0.35)]">
            CREATYXO
          </h1>
          <p className="text-[10px] font-bold tracking-[0.28em] text-slate-400 font-['Orbitron',sans-serif] uppercase">
            BLOCK PUZZLE
          </p>
        </div>

        {/* Clean Score Card */}
        <div className="w-full max-w-[280px] bg-[#0c1220] border border-[#1b263d] rounded-2xl px-5 py-3.5 flex items-center justify-between shadow-sm">
          <div className="flex flex-col text-left">
            <span className="text-[10px] font-bold text-slate-400 font-['Orbitron',sans-serif] tracking-wider">
              BEST SCORE
            </span>
            <span className="text-2xl font-black text-[#f6c445] font-['Orbitron',sans-serif] mt-0.5">
              {bestScore.toLocaleString()}
            </span>
          </div>

          <div className="flex flex-col items-end">
            <span className="text-[10px] font-bold text-slate-400 font-['Orbitron',sans-serif] tracking-wider">
              RANK
            </span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-sm font-black text-white font-['Orbitron',sans-serif]">
                #{userRank}
              </span>
              <span
                className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${tierStyle.bg} ${tierStyle.text} ${tierStyle.border} font-['Orbitron',sans-serif]`}
              >
                {tier}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Spacious Main Action Buttons */}
      <div className="w-full max-w-[300px] flex flex-col gap-2.5 mb-1">
        {/* PRIMARY: JUMP INTO THE GAME */}
        <button
          type="button"
          onClick={onStartGame}
          className="w-full py-4 rounded-xl bg-[#3debe0] hover:bg-[#34d1c6] text-[#070a11] font-black tracking-widest text-xs font-['Orbitron',sans-serif] active:scale-95 transition-all shadow-[0_0_18px_rgba(61,235,224,0.3)] cursor-pointer"
        >
          JUMP INTO THE GAME
        </button>

        {/* SECONDARY: LEADERBOARD */}
        <button
          type="button"
          onClick={onOpenLeaderboard}
          className="w-full py-3 rounded-xl bg-[#121828] border border-[#1d273f] hover:border-[#3debe0]/40 text-slate-200 hover:text-white font-bold tracking-wider text-xs font-['Orbitron',sans-serif] hover:bg-[#161f33] active:scale-95 transition-all cursor-pointer"
        >
          LEADERBOARD
        </button>

        {/* TERTIARY: HOW TO PLAY TUTORIAL */}
        <button
          type="button"
          onClick={onOpenTutorial}
          className="w-full py-2.5 rounded-xl bg-transparent border border-transparent hover:border-[#1d273f] text-slate-400 hover:text-slate-200 font-bold tracking-wider text-xs font-['Orbitron',sans-serif] transition-all cursor-pointer"
        >
          HOW TO PLAY
        </button>
      </div>

      {/* Clean quiet footer */}
      <footer className="text-[9px] text-slate-600 font-['Orbitron',sans-serif] tracking-widest uppercase">
        Match Rows & Columns
      </footer>
    </div>
  );
};
