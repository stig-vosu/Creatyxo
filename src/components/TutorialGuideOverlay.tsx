/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { PieceShape } from '../game/types';
import { COLOR_THEMES } from '../game/shapes';

interface TutorialGuideOverlayProps {
  step: 1 | 2 | 3;
  targetR: number;
  targetC: number;
  piece: PieceShape | null;
  traySlotIndex: number;
  boardElement: HTMLElement | null;
  isDragging: boolean;
  onSkip: () => void;
  onStartPlaying: () => void;
}

export const TutorialGuideOverlay: React.FC<TutorialGuideOverlayProps> = ({
  step,
  targetR,
  targetC,
  piece,
  traySlotIndex,
  boardElement,
  isDragging,
  onSkip,
  onStartPlaying,
}) => {
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

  // Dynamically compute precise pixel locations from DOM
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

  const rows = piece ? piece.matrix.length : 0;
  const cols = piece ? piece.matrix[0].length : 0;
  const theme = piece ? COLOR_THEMES[piece.color] : null;

  return (
    <div className="absolute inset-0 pointer-events-none z-30 select-none">
      {/* Top Banner Guide - Sleek Cyber HUD */}
      <div className="absolute top-2 left-3 right-3 pointer-events-auto bg-[#0a0f1d]/95 border border-[#3debe0]/60 rounded-xl px-3.5 py-2.5 shadow-[0_4px_24px_rgba(0,0,0,0.85)] flex items-center justify-between z-40 animate-fadeIn">
        <div className="flex flex-col text-left pr-2">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-[#3debe0] animate-ping" />
            <span className="text-[10px] text-[#3debe0] font-black tracking-widest font-['Orbitron',sans-serif] uppercase">
              {step === 1
                ? 'TUTORIAL • TEST STEP 1'
                : step === 2
                ? 'TUTORIAL • TEST STEP 2'
                : 'TUTORIAL COMPLETE!'}
            </span>
          </div>
          <span className="text-xs font-bold text-white font-['Orbitron',sans-serif] mt-0.5">
            {step === 1
              ? 'Drag block to grid to test the mechanics'
              : step === 2
              ? 'Drop piece into gap to feel the row clear!'
              : 'You are ready to jump into the real game!'}
          </span>
        </div>

        {step === 3 ? (
          <button
            type="button"
            onClick={onStartPlaying}
            className="px-3.5 py-2 rounded-lg bg-[#3debe0] hover:bg-[#34d1c6] text-[#070a11] font-black tracking-wider text-xs font-['Orbitron',sans-serif] cursor-pointer shadow-[0_0_14px_rgba(61,235,224,0.5)] active:scale-95 transition-all shrink-0"
          >
            START PLAYING
          </button>
        ) : (
          <button
            type="button"
            onClick={onSkip}
            className="px-3 py-1.5 rounded-lg bg-[#141b2e] border border-[#233554] hover:border-[#3debe0]/50 text-slate-300 hover:text-white font-bold tracking-wider text-[10px] font-['Orbitron',sans-serif] cursor-pointer active:scale-95 transition-all shrink-0"
          >
            SKIP
          </button>
        )}
      </div>

      {/* Target Drop Zone Highlight Ring */}
      {coords && step !== 3 && (
        <div
          className="fixed pointer-events-none z-20 -translate-x-1/2 -translate-y-1/2 rounded-xl border-2 border-dashed border-[#3debe0] bg-[#3debe0]/15 animate-pulse shadow-[0_0_18px_rgba(61,235,224,0.35)] flex items-center justify-center"
          style={{
            left: `${coords.targetX}px`,
            top: `${coords.targetY}px`,
            width: `${coords.targetW + 6}px`,
            height: `${coords.targetH + 6}px`,
          }}
        >
          <span className="text-[9px] font-black tracking-widest text-[#3debe0] bg-[#070a11]/85 px-1.5 py-0.5 rounded border border-[#3debe0]/40 font-['Orbitron',sans-serif]">
            DROP HERE
          </span>
        </div>
      )}

      {/* Animated Traveling Lower-Opacity Ghost Blocks (Tray -> Grid) */}
      {coords && piece && theme && !isDragging && step !== 3 && (
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
            className="grid drop-shadow-[0_0_16px_rgba(61,235,224,0.65)]"
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
                  className={`rounded-md border border-[#3debe0]/70 transition-all ${
                    cell === 1
                      ? `${theme.solid} opacity-60 shadow-lg`
                      : 'bg-transparent border-none'
                  }`}
                  style={{
                    width: `${coords.cellPx}px`,
                    height: `${coords.cellPx}px`,
                  }}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
