/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { PlayerProfile, generateRandomName } from '../game/leaderboard';

interface NameSetupModalProps {
  currentProfile: PlayerProfile;
  isOpen: boolean;
  onSave: (profile: PlayerProfile) => void;
  onClose?: () => void;
  isInitialSetup?: boolean;
}

export const NameSetupModal: React.FC<NameSetupModalProps> = ({
  currentProfile,
  isOpen,
  onSave,
  onClose,
  isInitialSetup = false,
}) => {
  const [username, setUsername] = useState(currentProfile.username || '');
  const [tag, setTag] = useState(currentProfile.tag || '');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  // When rolling a name: NUMBERS APPEAR!
  const handleRollRandom = () => {
    const random = generateRandomName();
    setUsername(random.username);
    setTag(random.tag);
    setError('');
  };

  const handleUsernameChange = (val: string) => {
    const sanitized = val.replace(/[^a-zA-Z0-9_\-\s]/g, '');
    setUsername(sanitized);
    // If the user manually edits/types their own name, clear the tag number!
    setTag('');
    setError('');
  };

  const handleSave = () => {
    const trimmed = username.trim();
    if (!trimmed) {
      setError('Please enter a name or click Roll Name');
      return;
    }
    if (trimmed.length > 16) {
      setError('Name must be 16 characters or less');
      return;
    }

    onSave({
      username: trimmed,
      tag: tag.trim() || undefined, // Custom names have NO numbers!
      avatarLetter: trimmed.charAt(0).toUpperCase() || 'P',
      hasChosenName: true,
    });
  };

  const handleSkip = () => {
    // When skipping, assign a rolled name with numbers
    const random = generateRandomName();
    onSave({
      username: random.username,
      tag: random.tag,
      avatarLetter: random.username.charAt(0).toUpperCase(),
      hasChosenName: true,
    });
  };

  const displayInitial = (username.trim().charAt(0) || 'P').toUpperCase();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-sm bg-[#0c1220] border border-[#1b263d] rounded-2xl p-7 shadow-2xl flex flex-col gap-5 text-center">
        {/* Header */}
        <div className="flex flex-col items-center gap-2">
          {/* Clean Monogram Circle */}
          <div className="w-14 h-14 rounded-2xl bg-[#141d30] border border-[#233250] flex items-center justify-center text-xl font-black text-[#3debe0] font-['Orbitron',sans-serif] shadow-sm">
            {displayInitial}
          </div>

          <h2 className="text-lg font-bold text-white font-['Orbitron',sans-serif] tracking-wider mt-1">
            {isInitialSetup ? 'WELCOME TO CREATYXO' : 'PLAYER SETTINGS'}
          </h2>

          <p className="text-xs text-slate-400 font-['Orbitron',sans-serif] max-w-[260px] leading-relaxed">
            {isInitialSetup
              ? 'Choose your player name. Rolling a random name includes a unique number tag.'
              : 'Enter a custom name without numbers, or roll a random callsign.'}
          </p>
        </div>

        {/* Input Field */}
        <div className="flex flex-col gap-2 text-left">
          <label className="text-[10px] text-slate-400 font-bold tracking-wider font-['Orbitron',sans-serif]">
            PLAYER NAME
          </label>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={username}
              onChange={(e) => handleUsernameChange(e.target.value)}
              maxLength={16}
              placeholder="e.g. Alex"
              className="flex-1 bg-[#101625] border border-[#1d273f] rounded-xl px-4 py-3 text-sm font-bold text-white font-['Orbitron',sans-serif] focus:outline-none focus:border-[#3debe0]/70 transition-all placeholder:text-slate-600 placeholder:font-normal"
            />

            {/* Tag only shown if rolled! */}
            {tag && (
              <div
                className="bg-[#141b2e] border border-[#233250] rounded-xl px-3 py-3 text-xs font-bold text-slate-300 font-mono"
                title="Number tag from random roll"
              >
                #{tag}
              </div>
            )}
          </div>

          {error && (
            <span className="text-xs text-rose-400 font-bold font-['Orbitron',sans-serif]">
              {error}
            </span>
          )}

          <span className="text-[10px] text-slate-500 font-['Orbitron',sans-serif]">
            {tag
              ? 'Random name roll includes a number tag.'
              : 'Custom names have no number tag.'}
          </span>
        </div>

        {/* Roll Random Name Button */}
        <button
          type="button"
          onClick={handleRollRandom}
          className="w-full py-2.5 px-4 rounded-xl bg-[#141b2e] border border-[#233250] hover:border-[#3debe0]/40 text-slate-300 hover:text-white text-xs font-bold tracking-wider font-['Orbitron',sans-serif] transition-all cursor-pointer"
        >
          ROLL RANDOM NAME
        </button>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2.5 pt-1">
          <button
            type="button"
            onClick={handleSave}
            className="w-full py-3 rounded-xl bg-[#3debe0] text-[#070a11] font-black tracking-wider text-xs font-['Orbitron',sans-serif] hover:bg-[#34d1c6] active:scale-95 transition-all shadow-md cursor-pointer"
          >
            CONFIRM NAME
          </button>

          {isInitialSetup ? (
            <button
              type="button"
              onClick={handleSkip}
              className="w-full py-2 rounded-xl bg-transparent text-slate-500 hover:text-slate-300 text-xs font-bold tracking-wider font-['Orbitron',sans-serif] transition-all cursor-pointer"
            >
              SKIP FOR NOW
            </button>
          ) : (
            onClose && (
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2 rounded-xl bg-transparent text-slate-500 hover:text-slate-300 text-xs font-bold tracking-wider font-['Orbitron',sans-serif] transition-all cursor-pointer"
              >
                CANCEL
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
};
