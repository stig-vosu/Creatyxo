/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { BlockColor, PieceShape } from '../game/types';
import { COLOR_THEMES } from '../game/shapes';

interface TutorialGuideOverlayProps {
  step: 1 | 2 | 3;
  targetR: number;
  targetC: number;
  piece: PieceShape | null;
  traySlotIndex: number;
  boardElement: HTMLElement | null;
  isDragging: boolean;
  onSelectStep: (step: 1 | 2 | 3) => void;
  onSkip: () => void;
  onStartPlaying: () => void;
}

/**
 * Renders an authentic block matching the real game's 3D glossy beveled style
 */
const RealisticBlock: React.FC<{
  color: BlockColor;
  className?: string;
  size?: number;
}> = ({ color, className = '', size = 26 }) => {
  const theme = COLOR_THEMES[color];
  return (
    <div
      className={`rounded-[5px] border ${theme.border} ${theme.solid} ${theme.shadow} flex items-center justify-center shrink-0 ${className}`}
      style={{ width: `${size}px`, height: `${size}px` }}
    />
  );
};

export const TutorialGuideOverlay: React.FC<TutorialGuideOverlayProps> = ({
  step,
  targetR,
  targetC,
  piece,
  traySlotIndex,
  boardElement,
  isDragging,
  onSelectStep,
  onSkip,
  onStartPlaying,
}) => {
  // Whether the full walkthrough modal card is open
  const [showModalCard, setShowModalCard] = useState<boolean>(true);
  // Current active step (1 | 2 | 3)
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(step);

  // Synchronize when parent updates step
  useEffect(() => {
    setCurrentStep(step);
    setShowModalCard(true);
  }, [step]);

  const [coords, setCoords] = useState<{
    startX: number;
    startY: number;
    targetX: number;
    targetY: number;
    cellPx: number;
    gapPx: number;
    targetW: number;
    targetH: number;
  } | null>(null);

  // Measure exact pixel coordinates of target grid area and tray slot
  useEffect(() => {
    if (!boardElement || step === 3 || !piece) {
      setCoords(null);
      return;
    }

    const rows = piece.matrix.length;
    const cols = piece.matrix[0].length;

    const updateMeasurements = () => {
      const firstCell = boardElement.querySelector(
        `[data-r="${targetR}"][data-c="${targetC}"]`
      ) as HTMLElement | null;

      const secondCell = boardElement.querySelector(
        `[data-r="${targetR}"][data-c="${targetC + 1}"]`
      ) as HTMLElement | null;

      const traySlot = document.querySelector(
        `[data-tray-slot="${traySlotIndex}"]`
      ) as HTMLElement | null;

      if (firstCell && traySlot) {
        const firstRect = firstCell.getBoundingClientRect();
        const trayRect = traySlot.getBoundingClientRect();

        let gap = 4;
        if (secondCell) {
          const secondRect = secondCell.getBoundingClientRect();
          gap = Math.max(2, secondRect.left - firstRect.right);
        }

        const cellWidth = firstRect.width;
        const totalW = cols * cellWidth + (cols - 1) * gap;
        const totalH = rows * cellWidth + (rows - 1) * gap;

        setCoords({
          startX: trayRect.left + trayRect.width / 2,
          startY: trayRect.top + trayRect.height / 2,
          targetX: firstRect.left + totalW / 2,
          targetY: firstRect.top + totalH / 2,
          cellPx: cellWidth,
          gapPx: gap,
          targetW: totalW,
          targetH: totalH,
        });
      }
    };

    updateMeasurements();
    const interval = setInterval(updateMeasurements, 400);
    window.addEventListener('resize', updateMeasurements);
    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', updateMeasurements);
    };
  }, [boardElement, targetR, targetC, traySlotIndex, step, piece]);

  const handleGoToStep = (newStep: 1 | 2 | 3) => {
    setCurrentStep(newStep);
    onSelectStep(newStep);
  };

  const rows = piece ? piece.matrix.length : 0;
  const cols = piece ? piece.matrix[0].length : 0;
  const theme = piece ? COLOR_THEMES[piece.color] : null;

  return (
    <>
      {/* 1. TUTORIAL WALKTHROUGH MODAL CARD WITH BLURRED BACKDROP */}
      {showModalCard && (
        <div className="fixed inset-0 z-50 bg-[#040711]/85 backdrop-blur-md flex items-center justify-center p-4 select-none animate-fadeIn">
          <div className="w-full max-w-[360px] bg-[#0c1324] border border-[#233554] shadow-[0_20px_50px_rgba(0,0,0,0.9)] rounded-2xl p-5 flex flex-col items-center text-center relative overflow-hidden">
            {/* Ambient Corner Glow */}
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-[#3debe0]/15 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-[#f6c445]/15 rounded-full blur-2xl pointer-events-none" />

            {/* Top Bar with Title and Skip Button */}
            <div className="w-full flex items-center justify-between pb-1 border-b border-[#1b263d] mb-2">
              <span className="text-[10px] font-bold text-[#3debe0] tracking-widest uppercase font-['Orbitron',sans-serif]">
                HOW TO PLAY • STEP {currentStep} OF 3
              </span>
              <button
                type="button"
                onClick={onSkip}
                className="text-[10px] text-slate-500 hover:text-white font-bold font-['Orbitron',sans-serif] tracking-wider cursor-pointer"
                title="Skip tutorial and play now"
              >
                SKIP
              </button>
            </div>

            {/* Gray Balls (Step Indicator Dots) */}
            <div className="flex items-center justify-center gap-2.5 my-2.5" aria-label="Tutorial Progress">
              {[1, 2, 3].map((stepNum) => {
                const isActive = currentStep === stepNum;
                return (
                  <button
                    key={stepNum}
                    type="button"
                    onClick={() => handleGoToStep(stepNum as 1 | 2 | 3)}
                    className={`transition-all duration-300 rounded-full cursor-pointer focus:outline-none ${
                      isActive
                        ? 'w-7 h-2.5 bg-[#3debe0] shadow-[0_0_10px_rgba(61,235,224,0.8)]'
                        : 'w-2.5 h-2.5 bg-slate-600 hover:bg-slate-400'
                    }`}
                    title={`Go to step ${stepNum}`}
                    aria-label={`Step ${stepNum} ${isActive ? '(current)' : ''}`}
                  />
                );
              })}
            </div>

            {/* STEP 1: DRAG & PLACE BLOCKS */}
            {currentStep === 1 && (
              <div className="flex flex-col items-center w-full animate-fadeIn">
                <h3 className="text-sm font-black text-white font-['Orbitron',sans-serif] mt-1 mb-2 tracking-wide">
                  PLACE SHAPES ON GRID
                </h3>

                {/* Visual Demonstration with Authentic 3D Blocks */}
                <div className="w-full h-36 bg-[#080d1a] border border-[#18233a] rounded-xl my-2 flex flex-col items-center justify-center relative p-3">
                  <div className="grid grid-cols-4 grid-rows-4 gap-1 p-2 bg-[#0a0f1d] rounded-lg border border-[#1b2944]">
                    {/* (0,0) Gold, (0,1) Purple */}
                    <RealisticBlock color="gold" size={20} />
                    <RealisticBlock color="purple" size={20} />
                    <div className="w-5 h-5 rounded-[4px] bg-[#101625] border border-[#172034]" />
                    <div className="w-5 h-5 rounded-[4px] bg-[#101625] border border-[#172034]" />

                    {/* (1,0) Empty, (1,1)-(2,2) 2x2 Cyan Target */}
                    <div className="w-5 h-5 rounded-[4px] bg-[#101625] border border-[#172034]" />
                    <RealisticBlock color="cyan" size={20} className="animate-pulse shadow-[0_0_8px_#3debe0]" />
                    <RealisticBlock color="cyan" size={20} className="animate-pulse shadow-[0_0_8px_#3debe0]" />
                    <div className="w-5 h-5 rounded-[4px] bg-[#101625] border border-[#172034]" />

                    <div className="w-5 h-5 rounded-[4px] bg-[#101625] border border-[#172034]" />
                    <RealisticBlock color="cyan" size={20} className="animate-pulse shadow-[0_0_8px_#3debe0]" />
                    <RealisticBlock color="cyan" size={20} className="animate-pulse shadow-[0_0_8px_#3debe0]" />
                    <div className="w-5 h-5 rounded-[4px] bg-[#101625] border border-[#172034]" />

                    {/* Bottom Row */}
                    <div className="w-5 h-5 rounded-[4px] bg-[#101625] border border-[#172034]" />
                    <div className="w-5 h-5 rounded-[4px] bg-[#101625] border border-[#172034]" />
                    <RealisticBlock color="orange" size={20} />
                    <RealisticBlock color="green" size={20} />
                  </div>
                  <span className="text-[9px] text-[#3debe0] font-bold font-['Orbitron',sans-serif] mt-1.5 flex items-center gap-1">
                    Drag shapes into any matching open space
                  </span>
                </div>

                <p className="text-xs text-slate-300 font-['Orbitron',sans-serif] leading-relaxed my-2">
                  Pick up shapes from the bottom tray and drag them onto the board. Blocks can be placed anywhere they fit with no overlap.
                </p>

                {/* Primary Button: NEXT */}
                <button
                  type="button"
                  onClick={() => handleGoToStep(2)}
                  className="w-full mt-3 py-3.5 rounded-xl bg-[#3debe0] hover:bg-[#34d1c6] text-[#070a11] font-black text-xs font-['Orbitron',sans-serif] tracking-wider active:scale-95 transition-all shadow-[0_0_16px_rgba(61,235,224,0.35)] cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>NEXT</span>
                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                    <path d="M5 13h11.86l-5.43 5.43 1.42 1.42L21.14 12l-8.29-8.29-1.42 1.42L16.86 11H5v2z" />
                  </svg>
                </button>

                {/* Secondary Option: Practice Dragging on Board */}
                <button
                  type="button"
                  onClick={() => setShowModalCard(false)}
                  className="mt-2 text-[10px] text-[#3debe0] hover:underline font-bold font-['Orbitron',sans-serif] tracking-wider cursor-pointer py-1"
                >
                  Try Dragging On Board →
                </button>
              </div>
            )}

            {/* STEP 2: COMPLETE ROWS & COLUMNS */}
            {currentStep === 2 && (
              <div className="flex flex-col items-center w-full animate-fadeIn">
                <h3 className="text-sm font-black text-white font-['Orbitron',sans-serif] mt-1 mb-2 tracking-wide">
                  BLAST ROWS & COLUMNS
                </h3>

                {/* Visual Demonstration: Authentic 8-Block Row with Real 3D Block Styles */}
                <div className="w-full h-36 bg-[#080d1a] border border-[#18233a] rounded-xl my-2 flex flex-col items-center justify-center relative p-3">
                  {/* Floating 2x1 cyan piece dropping into the gap */}
                  <div className="flex items-center gap-1 mb-2 animate-bounce">
                    <RealisticBlock color="cyan" size={22} />
                    <RealisticBlock color="cyan" size={22} />
                    <svg className="w-3.5 h-3.5 fill-[#3debe0] ml-1" viewBox="0 0 24 24">
                      <path d="M11 4v11.86l-5.43-5.43-1.42 1.42L12 19.71l7.85-7.86-1.42-1.42L13 15.86V4h-2z" />
                    </svg>
                  </div>

                  {/* Complete 8-Block Row matching real board colors and 3D style */}
                  <div className="flex items-center gap-1 p-2 bg-[#0a0f1d] rounded-lg border border-[#1b2944]">
                    <RealisticBlock color="orange" size={22} />
                    <RealisticBlock color="rose" size={22} />
                    <RealisticBlock color="purple" size={22} />
                    {/* The 2 gap cells highlighted in cyan dashed border */}
                    <div className="w-[22px] h-[22px] rounded-[5px] border-2 border-dashed border-[#3debe0] bg-[#3debe0]/20 flex items-center justify-center animate-pulse">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#3debe0]" />
                    </div>
                    <div className="w-[22px] h-[22px] rounded-[5px] border-2 border-dashed border-[#3debe0] bg-[#3debe0]/20 flex items-center justify-center animate-pulse">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#3debe0]" />
                    </div>
                    <RealisticBlock color="green" size={22} />
                    <RealisticBlock color="gold" size={22} />
                    <RealisticBlock color="blue" size={22} />
                  </div>

                  <span className="text-[9px] text-[#f6c445] font-bold font-['Orbitron',sans-serif] mt-2 flex items-center gap-1">
                    Fill the 2 open slots to blast the full row!
                  </span>
                </div>

                <p className="text-xs text-slate-300 font-['Orbitron',sans-serif] leading-relaxed my-2">
                  When you fill an entire row (horizontal) or column (vertical) from edge to edge, it vaporizes in a flash and clears board space!
                </p>

                {/* Navigation Buttons: PREVIOUS & NEXT */}
                <div className="w-full grid grid-cols-2 gap-2 mt-3">
                  <button
                    type="button"
                    onClick={() => handleGoToStep(1)}
                    className="py-3.5 rounded-xl bg-[#141b2e] border border-[#233554] hover:border-slate-500 text-slate-300 hover:text-white font-bold text-xs font-['Orbitron',sans-serif] tracking-wider active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                      <path d="M19 11H7.14l5.43-5.43-1.42-1.42L3.86 12l7.29 7.29 1.42-1.42L7.14 13H19v-2z" />
                    </svg>
                    <span>PREV</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleGoToStep(3)}
                    className="py-3.5 rounded-xl bg-[#3debe0] hover:bg-[#34d1c6] text-[#070a11] font-black text-xs font-['Orbitron',sans-serif] tracking-wider active:scale-95 transition-all shadow-[0_0_16px_rgba(61,235,224,0.35)] cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <span>NEXT</span>
                    <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                      <path d="M5 13h11.86l-5.43 5.43 1.42 1.42L21.14 12l-8.29-8.29-1.42 1.42L16.86 11H5v2z" />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: CHAIN COMBOS & HIGH SCORES */}
            {currentStep === 3 && (
              <div className="flex flex-col items-center w-full animate-fadeIn">
                <h3 className="text-sm font-black text-white font-['Orbitron',sans-serif] mt-1 mb-2 tracking-wide">
                  CHAIN COMBOS & SCORE BIG
                </h3>

                {/* Visual Demonstration: Multiple Clears and Multiplier Badge */}
                <div className="w-full h-36 bg-[#080d1a] border border-[#18233a] rounded-xl my-2 flex flex-col items-center justify-center relative p-3">
                  <div className="px-3.5 py-1.5 rounded-full bg-[#2d1523] border border-[#4d1f35] text-[#f43f5e] font-black text-sm tracking-wider font-['Orbitron',sans-serif] shadow-[0_0_16px_rgba(244,63,94,0.5)] animate-pulse">
                    COMBO 3x • +2,400 PTS
                  </div>

                  {/* Dual flashing rows illustration */}
                  <div className="flex items-center gap-1.5 mt-3">
                    <div className="w-6 h-6 rounded-[5px] bg-white shadow-[0_0_12px_#ffffff] border border-white flex items-center justify-center" />
                    <div className="w-6 h-6 rounded-[5px] bg-white shadow-[0_0_12px_#ffffff] border border-white flex items-center justify-center" />
                    <div className="w-6 h-6 rounded-[5px] bg-white shadow-[0_0_12px_#ffffff] border border-white flex items-center justify-center" />
                    <span className="text-[10px] text-emerald-400 font-black font-['Orbitron',sans-serif] ml-1">
                      MULTI-LINE BLAST
                    </span>
                  </div>

                  <span className="text-[9px] text-slate-400 font-['Orbitron',sans-serif] mt-2">
                    Consecutive line clears multiply your points!
                  </span>
                </div>

                <p className="text-xs text-slate-300 font-['Orbitron',sans-serif] leading-relaxed my-2">
                  Clear multiple lines with a single block, or clear lines on consecutive moves to build huge Combos and reach Grandmaster tier!
                </p>

                {/* Navigation Buttons: PREVIOUS & START PLAYING */}
                <div className="w-full grid grid-cols-2 gap-2 mt-3">
                  <button
                    type="button"
                    onClick={() => handleGoToStep(2)}
                    className="py-3.5 rounded-xl bg-[#141b2e] border border-[#233554] hover:border-slate-500 text-slate-300 hover:text-white font-bold text-xs font-['Orbitron',sans-serif] tracking-wider active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                      <path d="M19 11H7.14l5.43-5.43-1.42-1.42L3.86 12l7.29 7.29 1.42-1.42L7.14 13H19v-2z" />
                    </svg>
                    <span>PREV</span>
                  </button>

                  <button
                    type="button"
                    onClick={onStartPlaying}
                    className="py-3.5 rounded-xl bg-[#3debe0] hover:bg-[#34d1c6] text-[#070a11] font-black text-xs font-['Orbitron',sans-serif] tracking-wider active:scale-95 transition-all shadow-[0_0_20px_rgba(61,235,224,0.45)] cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <span>START GAME</span>
                    <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. IN-GAME PRACTICE HUD (WHEN USER CHOOSES TO PRACTICE DRAGGING ON BOARD) */}
      {!showModalCard && (
        <div className="absolute top-2 left-3 right-3 pointer-events-auto z-40 animate-fadeIn">
          <div className="bg-[#0a0f1d]/90 backdrop-blur-md border border-[#3debe0]/60 rounded-xl px-3 py-2 shadow-[0_4px_24px_rgba(0,0,0,0.85)] flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <span className="inline-block w-2 h-2 rounded-full bg-[#3debe0] animate-ping shrink-0" />
              <div className="flex flex-col text-left truncate">
                <span className="text-[9px] font-black text-[#3debe0] tracking-widest uppercase font-['Orbitron',sans-serif]">
                  PRACTICE • STEP {currentStep} OF 3
                </span>
                <span className="text-[11px] font-bold text-white font-['Orbitron',sans-serif] truncate">
                  {currentStep === 1
                    ? 'Drag square into glowing zone'
                    : 'Drop piece into gap to blast row!'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0 pl-2">
              <button
                type="button"
                onClick={() => setShowModalCard(true)}
                className="px-2.5 py-1 rounded-lg bg-[#141b2e] border border-[#233554] hover:border-[#3debe0]/60 text-slate-300 hover:text-white font-bold text-[10px] font-['Orbitron',sans-serif] cursor-pointer"
                title="Open tutorial guide"
              >
                GUIDE
              </button>
              <button
                type="button"
                onClick={onSkip}
                className="px-2.5 py-1 rounded-lg bg-[#141b2e] border border-[#233554] hover:border-slate-500 text-slate-400 hover:text-white font-bold text-[10px] font-['Orbitron',sans-serif] cursor-pointer"
              >
                SKIP
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. TARGET DROP ZONE HIGHLIGHT ON THE GRID */}
      {coords && step !== 3 && !showModalCard && (
        <div
          className="fixed pointer-events-none z-20 -translate-x-1/2 -translate-y-1/2 rounded-xl border-2 border-dashed border-[#3debe0] bg-[#3debe0]/15 animate-pulse shadow-[0_0_22px_rgba(61,235,224,0.4)] flex items-center justify-center"
          style={{
            left: `${coords.targetX}px`,
            top: `${coords.targetY}px`,
            width: `${coords.targetW + 6}px`,
            height: `${coords.targetH + 6}px`,
          }}
        >
          <span className="text-[9px] font-black tracking-widest text-[#3debe0] bg-[#070a11]/90 px-2 py-0.5 rounded border border-[#3debe0]/50 font-['Orbitron',sans-serif] shadow-sm">
            DROP HERE
          </span>
        </div>
      )}

      {/* 4. ANIMATED TRAVELING GHOST BLOCK DEMO (FROM TRAY SLOT TO TARGET) */}
      {coords && piece && theme && !isDragging && step !== 3 && !showModalCard && (
        <div
          className="fixed pointer-events-none z-30"
          style={
            {
              '--start-x': `${coords.startX}px`,
              '--start-y': `${coords.startY}px`,
              '--target-x': `${coords.targetX}px`,
              '--target-y': `${coords.targetY}px`,
              animation: 'tutorialTravel 1.8s ease-in-out infinite',
              left: 0,
              top: 0,
            } as React.CSSProperties
          }
        >
          <div
            className="grid drop-shadow-[0_0_18px_rgba(61,235,224,0.7)] relative"
            style={{
              gridTemplateRows: `repeat(${rows}, ${coords.cellPx}px)`,
              gridTemplateColumns: `repeat(${cols}, ${coords.cellPx}px)`,
              gap: `${coords.gapPx}px`,
            }}
          >
            {piece.matrix.map((row, r) =>
              row.map((cell, c) => (
                <div
                  key={`ghost-${r}-${c}`}
                  className={`rounded-[5px] border ${theme.border} ${theme.solid} ${theme.shadow} transition-all ${
                    cell === 1
                      ? 'opacity-70 shadow-lg'
                      : 'bg-transparent border-none'
                  }`}
                  style={{
                    width: `${coords.cellPx}px`,
                    height: `${coords.cellPx}px`,
                  }}
                />
              ))
            )}

            {/* Glowing Pointer Icon indicating dragging direction */}
            <div className="absolute -bottom-6 -right-6 text-white drop-shadow-[0_0_8px_rgba(61,235,224,0.9)] animate-pulse">
              <svg className="w-6 h-6 fill-[#3debe0]" viewBox="0 0 24 24">
                <path d="M9 11.24V7.5a2.5 2.5 0 0 1 5 0v3.74c1.21-.81 2-2.18 2-3.74a4.5 4.5 0 0 0-9 0c0 1.56.79 2.93 2 3.74zm9.84 4.63-4.54-2.26A2 2 0 0 0 13.4 13.5H13V7.5a1 1 0 0 0-2 0v7.18l-3.32-.7a1.01 1.01 0 0 0-1.04.38 1 1 0 0 0-.13 1.09l3.52 7.04c.38.76 1.16 1.25 2.02 1.25h5.45c1.17 0 2.15-.89 2.27-2.06l.39-4.27a2.02 2.02 0 0 0-1.32-1.6z" />
              </svg>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
