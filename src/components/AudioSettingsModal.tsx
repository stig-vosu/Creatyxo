/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { playSoundVolumePreview } from '../game/audio';

interface AudioSettingsModalProps {
  isOpen: boolean;
  soundEnabled: boolean;
  musicEnabled: boolean;
  soundVolume: number; // 0.0 to 1.0
  musicVolume: number; // 0.0 to 1.0
  onToggleSound: () => void;
  onToggleMusic: () => void;
  onChangeSoundVolume: (volume: number) => void;
  onChangeMusicVolume: (volume: number) => void;
  onClose: () => void;
}

export const AudioSettingsModal: React.FC<AudioSettingsModalProps> = ({
  isOpen,
  soundEnabled,
  musicEnabled,
  soundVolume,
  musicVolume,
  onToggleSound,
  onToggleMusic,
  onChangeSoundVolume,
  onChangeMusicVolume,
  onClose,
}) => {
  if (!isOpen) return null;

  const soundPercent = Math.round(soundVolume * 100);
  const musicPercent = Math.round(musicVolume * 100);

  const handleSoundSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value) / 100;
    onChangeSoundVolume(val);
    playSoundVolumePreview(val);
  };

  const handleMusicSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value) / 100;
    onChangeMusicVolume(val);
  };

  const handleSetPreset = (preset: 'mute' | 'balanced' | 'max') => {
    if (preset === 'mute') {
      onChangeSoundVolume(0);
      onChangeMusicVolume(0);
    } else if (preset === 'balanced') {
      onChangeSoundVolume(0.6);
      onChangeMusicVolume(0.6);
      playSoundVolumePreview(0.6);
    } else if (preset === 'max') {
      onChangeSoundVolume(1.0);
      onChangeMusicVolume(1.0);
      playSoundVolumePreview(1.0);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#070a11]/90 backdrop-blur-md animate-fadeIn select-none"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-[#0c1220] border border-[#1b263d] rounded-2xl p-5 shadow-2xl flex flex-col gap-4 text-left"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#172238] pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#142036] border border-[#233554] flex items-center justify-center text-[#3debe0]">
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-black text-white font-['Orbitron',sans-serif] tracking-wider">
                AUDIO SETTINGS
              </h2>
              <p className="text-[10px] text-slate-400 font-['Orbitron',sans-serif] tracking-wide">
                ADJUST MUSIC & SOUND LOUDNESS
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close audio settings"
            className="w-7 h-7 rounded-lg bg-[#141d2f] hover:bg-[#1a263d] border border-[#22304d] text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer text-xs font-bold"
          >
            ✕
          </button>
        </div>

        {/* Music Volume Slider Control */}
        <div className="bg-[#101726] border border-[#19243a] rounded-xl p-3.5 flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[#3debe0]">
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                </svg>
              </span>
              <span className="text-xs font-bold text-slate-200 font-['Orbitron',sans-serif] tracking-wide">
                BACKGROUND MUSIC
              </span>
            </div>

            <button
              type="button"
              onClick={onToggleMusic}
              className={`text-[10px] font-bold px-2 py-0.5 rounded border transition-colors cursor-pointer font-['Orbitron',sans-serif] ${
                musicEnabled
                  ? 'bg-[#17303d] border-[#3debe0]/60 text-[#3debe0]'
                  : 'bg-[#181f2f] border-[#25324b] text-slate-500'
              }`}
            >
              {musicEnabled ? 'ACTIVE' : 'MUTED'}
            </button>
          </div>

          {/* Slider Row */}
          <div className="flex items-center gap-3">
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={musicPercent}
              onChange={handleMusicSlider}
              className="cyber-slider flex-1"
              aria-label="Background music volume"
            />
            <span className="text-xs font-black text-[#3debe0] font-['Orbitron',sans-serif] w-10 text-right">
              {musicPercent}%
            </span>
          </div>
        </div>

        {/* Sound Effects Volume Slider Control */}
        <div className="bg-[#101726] border border-[#19243a] rounded-xl p-3.5 flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[#3debe0]">
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
                </svg>
              </span>
              <span className="text-xs font-bold text-slate-200 font-['Orbitron',sans-serif] tracking-wide">
                SOUND EFFECTS
              </span>
            </div>

            <button
              type="button"
              onClick={onToggleSound}
              className={`text-[10px] font-bold px-2 py-0.5 rounded border transition-colors cursor-pointer font-['Orbitron',sans-serif] ${
                soundEnabled
                  ? 'bg-[#17303d] border-[#3debe0]/60 text-[#3debe0]'
                  : 'bg-[#181f2f] border-[#25324b] text-slate-500'
              }`}
            >
              {soundEnabled ? 'ACTIVE' : 'MUTED'}
            </button>
          </div>

          {/* Slider Row */}
          <div className="flex items-center gap-3">
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={soundPercent}
              onChange={handleSoundSlider}
              className="cyber-slider flex-1"
              aria-label="Sound effects volume"
            />
            <span className="text-xs font-black text-[#3debe0] font-['Orbitron',sans-serif] w-10 text-right">
              {soundPercent}%
            </span>
          </div>
        </div>

        {/* Preset Quick Buttons */}
        <div className="flex items-center justify-between gap-2 pt-1">
          <button
            type="button"
            onClick={() => handleSetPreset('mute')}
            className="flex-1 py-1.5 px-2 rounded-lg bg-[#141b2a] hover:bg-[#192236] border border-[#202b42] text-[10px] font-bold text-slate-400 hover:text-white font-['Orbitron',sans-serif] transition-all cursor-pointer text-center"
          >
            MUTE ALL
          </button>
          <button
            type="button"
            onClick={() => handleSetPreset('balanced')}
            className="flex-1 py-1.5 px-2 rounded-lg bg-[#141b2a] hover:bg-[#192236] border border-[#202b42] text-[10px] font-bold text-slate-300 hover:text-[#3debe0] font-['Orbitron',sans-serif] transition-all cursor-pointer text-center"
          >
            60% CHILL
          </button>
          <button
            type="button"
            onClick={() => handleSetPreset('max')}
            className="flex-1 py-1.5 px-2 rounded-lg bg-[#141b2a] hover:bg-[#192236] border border-[#202b42] text-[10px] font-bold text-[#3debe0] hover:bg-[#1c2e42] font-['Orbitron',sans-serif] transition-all cursor-pointer text-center"
          >
            100% MAX
          </button>
        </div>

        {/* Done Button */}
        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-[#3debe0] hover:bg-[#34d1c6] text-[#070a11] font-black tracking-widest text-xs font-['Orbitron',sans-serif] active:scale-95 transition-all shadow-[0_0_14px_rgba(61,235,224,0.3)] cursor-pointer mt-1"
        >
          CONFIRM & CLOSE
        </button>
      </div>
    </div>
  );
};
