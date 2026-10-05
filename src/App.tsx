/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  BlockColor,
  DraggingPieceState,
  GridState,
  PieceShape,
  PlacementCoordinate,
} from './game/types';
import {
  COLOR_THEMES,
  canPieceFitAnywhere,
  canPlacePiece,
  createEmptyGrid,
  getRandomPieces,
} from './game/shapes';
import {
  playClearSound,
  playGameOverSound,
  playPickSound,
  playPlaceSound,
} from './game/audio';

export default function App() {
  // Game Board State (8x8)
  const [grid, setGrid] = useState<GridState>(() => createEmptyGrid());

  // Piece Tray State (3 slots)
  const [tray, setTray] = useState<(PieceShape | null)[]>(() => getRandomPieces(3, createEmptyGrid()));

  // Score & Stats
  const [score, setScore] = useState<number>(0);
  const [bestScore, setBestScore] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('creatyxo_best_score');
      return saved ? parseInt(saved, 10) || 0 : 0;
    }
    return 0;
  });
  const [combo, setCombo] = useState<number>(0);
  const [totalLinesCleared, setTotalLinesCleared] = useState<number>(0);
  const [maxCombo, setMaxCombo] = useState<number>(0);
  const [isNewRecord, setIsNewRecord] = useState<boolean>(false);

  // Audio & Modals
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [clearingCells, setClearingCells] = useState<Set<string>>(new Set());

  // Dragging State
  const [dragging, setDragging] = useState<DraggingPieceState | null>(null);
  const [previewPlacement, setPreviewPlacement] = useState<PlacementCoordinate | null>(null);

  // References
  const boardRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef<DraggingPieceState | null>(null);
  draggingRef.current = dragging;

  const gridRef = useRef<GridState>(grid);
  gridRef.current = grid;

  const trayRef = useRef<(PieceShape | null)[]>(tray);
  trayRef.current = tray;

  // Sync best score to localStorage and track new record
  useEffect(() => {
    if (score > bestScore) {
      setBestScore(score);
      setIsNewRecord(true);
      try {
        localStorage.setItem('creatyxo_best_score', score.toString());
      } catch {
        // Ignore storage errors
      }
    }
  }, [score, bestScore]);

  // Restart / Reset game
  const resetGame = useCallback(() => {
    const empty = createEmptyGrid();
    setGrid(empty);
    setTray(getRandomPieces(3, empty));
    setScore(0);
    setCombo(0);
    setTotalLinesCleared(0);
    setMaxCombo(0);
    setIsNewRecord(false);
    setIsGameOver(false);
    setIsPaused(false);
    setClearingCells(new Set());
    setDragging(null);
    setPreviewPlacement(null);
  }, []);

  // Compute placement coordinate based on pointer coordinates
  const calculateTargetPlacement = useCallback(
    (pointerX: number, pointerY: number, piece: PieceShape, isTouch: boolean): PlacementCoordinate | null => {
      if (!boardRef.current) return null;
      const rect = boardRef.current.getBoundingClientRect();
      const cellSize = rect.width / 8;

      const pieceRows = piece.matrix.length;
      const pieceCols = piece.matrix[0].length;

      // When dragging on touch devices, offset the piece upward so finger does not obstruct target cells
      const visualY = isTouch ? pointerY - 70 : pointerY;

      // Calculate where the top-left of the piece should land
      const pieceLeft = pointerX - (pieceCols * cellSize) / 2;
      const pieceTop = visualY - (pieceRows * cellSize) / 2;

      const targetC = Math.round((pieceLeft - rect.left) / cellSize);
      const targetR = Math.round((pieceTop - rect.top) / cellSize);

      if (canPlacePiece(gridRef.current, piece, targetR, targetC)) {
        return { r: targetR, c: targetC };
      }
      return null;
    },
    []
  );

  // Drag handlers (Pointer events for mouse + touch support)
  const handlePointerDownPiece = (
    e: React.PointerEvent,
    piece: PieceShape,
    trayIndex: number
  ) => {
    if (isGameOver || isPaused) return;

    // Prevent default scrolling on touch
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);

    const isTouch = e.pointerType === 'touch';
    playPickSound(soundEnabled);

    const newDragState: DraggingPieceState = {
      piece,
      trayIndex,
      pointerX: e.clientX,
      pointerY: e.clientY,
      isTouch,
    };

    setDragging(newDragState);

    // Initial placement check
    const initialTarget = calculateTargetPlacement(e.clientX, e.clientY, piece, isTouch);
    setPreviewPlacement(initialTarget);
  };

  useEffect(() => {
    if (!dragging) return;

    const handlePointerMove = (e: PointerEvent) => {
      e.preventDefault();
      const current = draggingRef.current;
      if (!current) return;

      const nextDrag: DraggingPieceState = {
        ...current,
        pointerX: e.clientX,
        pointerY: e.clientY,
      };
      setDragging(nextDrag);

      const target = calculateTargetPlacement(e.clientX, e.clientY, current.piece, current.isTouch);
      setPreviewPlacement(target);
    };

    const handlePointerUp = (e: PointerEvent) => {
      const current = draggingRef.current;
      if (!current) return;

      const target = calculateTargetPlacement(e.clientX, e.clientY, current.piece, current.isTouch);

      if (target && canPlacePiece(gridRef.current, current.piece, target.r, target.c)) {
        // Valid drop! Lock block into place
        const piece = current.piece;
        const newGrid = gridRef.current.map((row) => [...row]);
        let blockCount = 0;

        for (let r = 0; r < piece.matrix.length; r++) {
          for (let c = 0; c < piece.matrix[0].length; c++) {
            if (piece.matrix[r][c] === 1) {
              newGrid[target.r + r][target.c + c] = piece.color;
              blockCount++;
            }
          }
        }

        // Remove piece from tray
        const nextTray = [...trayRef.current];
        nextTray[current.trayIndex] = null;

        // Check for completed rows & columns
        const fullRows: number[] = [];
        const fullCols: number[] = [];

        for (let r = 0; r < 8; r++) {
          if (newGrid[r].every((cell) => cell !== null)) {
            fullRows.push(r);
          }
        }

        for (let c = 0; c < 8; c++) {
          let colFull = true;
          for (let r = 0; r < 8; r++) {
            if (newGrid[r][c] === null) {
              colFull = false;
              break;
            }
          }
          if (colFull) {
            fullCols.push(c);
          }
        }

        const linesCleared = fullRows.length + fullCols.length;
        const basePoints = blockCount * 12;

        if (linesCleared > 0) {
          const nextCombo = combo + 1;
          setCombo(nextCombo);
          setMaxCombo((prev) => Math.max(prev, nextCombo));
          setTotalLinesCleared((prev) => prev + linesCleared);
          playClearSound(nextCombo, soundEnabled);

          // Mark cells clearing for a flash animation
          const clearingSet = new Set<string>();
          fullRows.forEach((r) => {
            for (let c = 0; c < 8; c++) clearingSet.add(`${r},${c}`);
          });
          fullCols.forEach((c) => {
            for (let r = 0; r < 8; r++) clearingSet.add(`${r},${c}`);
          });
          setClearingCells(clearingSet);

          // Clear line cells
          fullRows.forEach((r) => {
            for (let c = 0; c < 8; c++) newGrid[r][c] = null;
          });
          fullCols.forEach((c) => {
            for (let r = 0; r < 8; r++) newGrid[r][c] = null;
          });

          // Multi-line bonus multipliers for juicy scores
          let lineMultiplier = 150;
          if (linesCleared === 2) lineMultiplier = 360;
          else if (linesCleared === 3) lineMultiplier = 750;
          else if (linesCleared >= 4) lineMultiplier = 1300;

          const bonusPoints = lineMultiplier * (nextCombo + 1);
          setScore((prev) => prev + basePoints + bonusPoints);

          setTimeout(() => {
            setClearingCells(new Set());
          }, 240);
        } else {
          setCombo(0);
          setScore((prev) => prev + basePoints);
          playPlaceSound(soundEnabled);
        }

        // If tray is empty, spawn 3 new pieces
        const remainingPieces = nextTray.filter((p): p is PieceShape => p !== null);
        let finalTray = nextTray;
        if (remainingPieces.length === 0) {
          finalTray = getRandomPieces(3, newGrid);
        }

        setGrid(newGrid);
        setTray(finalTray);

        // Check Game Over: Can ANY remaining piece fit on the board?
        const activePieces = finalTray.filter((p): p is PieceShape => p !== null);
        const hasValidMove = activePieces.some((p) => canPieceFitAnywhere(newGrid, p));

        if (!hasValidMove) {
          setIsGameOver(true);
          playGameOverSound(soundEnabled);
        }
      }

      setDragging(null);
      setPreviewPlacement(null);
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: false });
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [dragging, combo, soundEnabled, calculateTargetPlacement]);

  // Check if cell is part of current placement preview
  const isPreviewCell = (r: number, c: number): boolean => {
    if (!previewPlacement || !dragging) return false;
    const { piece } = dragging;
    const relR = r - previewPlacement.r;
    const relC = c - previewPlacement.c;

    if (
      relR >= 0 &&
      relR < piece.matrix.length &&
      relC >= 0 &&
      relC < piece.matrix[0].length
    ) {
      return piece.matrix[relR][relC] === 1;
    }
    return false;
  };

  // Helper to render mini piece block for tray with dynamic auto-scaling
  const renderPieceBlocks = (piece: PieceShape) => {
    const theme = COLOR_THEMES[piece.color];
    const maxDim = Math.max(piece.matrix.length, piece.matrix[0].length);

    // Dynamic sizing so 5-block tall or wide pieces fit with plenty of room in the tray slot
    let cellPx = 18;
    if (maxDim >= 5) cellPx = 11;
    else if (maxDim === 4) cellPx = 14;
    else if (maxDim === 3) cellPx = 17;
    else if (maxDim === 2) cellPx = 20;
    else if (maxDim === 1) cellPx = 22;

    return (
      <div
        className="grid gap-[2px] transition-transform duration-200"
        style={{
          gridTemplateColumns: `repeat(${piece.matrix[0].length}, minmax(0, 1fr))`,
        }}
      >
        {piece.matrix.map((row, rIdx) =>
          row.map((val, cIdx) => (
            <div
              key={`${rIdx}-${cIdx}`}
              style={{
                width: `${cellPx}px`,
                height: `${cellPx}px`,
              }}
              className={`aspect-square flex items-center justify-center transition-all ${
                val === 1
                  ? `rounded-[4px] ${theme.solid} ${theme.shadow} border ${theme.border}`
                  : 'opacity-0'
              }`}
            />
          ))
        )}
      </div>
    );
  };

  // Cell size for dragging floating overlay
  const boardRect = boardRef.current?.getBoundingClientRect();
  const draggingCellPx = boardRect ? boardRect.width / 8 : 36;

  return (
    <div className="min-h-screen h-screen w-full bg-[#070a11] text-slate-100 flex flex-col items-center justify-center select-none font-['Orbitron',sans-serif] overflow-hidden p-0 sm:p-4 md:p-6 touch-none">
      {/* Game container with preserved custom responsive styling */}
      <main className="w-full max-w-[420px] h-full max-h-[820px] flex flex-col justify-between px-6 sm:px-8 pt-3 pb-12 sm:pb-16 md:pb-20 mx-auto relative">
        {/* Top Header Section */}
        <header className="flex flex-col gap-3 w-full shrink-0">
          {/* Top Bar: Pause, Title, Sound */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              aria-label="Pause game"
              onClick={() => setIsPaused((prev) => !prev)}
              style={{ marginRight: 0, marginLeft: 39, marginTop: 10 }}
              className="w-10 h-10 rounded-xl bg-[#141b2e] border border-[#222f4b] flex items-center justify-center text-[#3debe0] hover:bg-[#1a253f] active:scale-95 transition-all cursor-pointer shadow-sm shrink-0"
            >
              {isPaused ? (
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
              ) : (
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <rect x="5" y="4" width="4" height="16" rx="1.5" />
                  <rect x="15" y="4" width="4" height="16" rx="1.5" />
                </svg>
              )}
            </button>

            <h1
              style={{ marginTop: 10 }}
              className="text-[26px] sm:text-[32px] tracking-wide text-[#3debe0] uppercase font-['Black_Ops_One',sans-serif] drop-shadow-[0_0_16px_rgba(61,235,224,0.55)] text-center px-1 leading-none select-none"
            >
              CREATYXO
            </h1>

            <button
              type="button"
              aria-label={soundEnabled ? 'Mute sound' : 'Unmute sound'}
              onClick={() => setSoundEnabled((prev) => !prev)}
              style={{
                paddingTop: 0,
                paddingLeft: 0,
                marginLeft: 0,
                marginTop: 10,
                marginBottom: 0,
                marginRight: 39,
              }}
              className="w-10 h-10 rounded-xl bg-[#141b2e] border border-[#222f4b] flex items-center justify-center text-[#3debe0] hover:bg-[#1a253f] active:scale-95 transition-all cursor-pointer shadow-sm shrink-0"
            >
              {soundEnabled ? (
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M14 3.23v17.54a1 1 0 0 1-1.6.8L6.7 16H3a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1h3.7l5.7-5.57a1 1 0 0 1 1.6.8zm4.5 5.27a1 1 0 0 1 1.41.09A7.95 7.95 0 0 1 22 12c0 2.22-.9 4.23-2.35 5.68a1 1 0 1 1-1.42-1.41A5.96 5.96 0 0 0 20 12c0-1.66-.67-3.17-1.76-4.27a1 1 0 0 1 .26-1.23z" />
                </svg>
              ) : (
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
                </svg>
              )}
            </button>
          </div>

          {/* Score Cards Row */}
          <div className="grid grid-cols-2 gap-3 w-full">
            {/* Score Card */}
            <div
              style={{
                paddingTop: 0,
                paddingLeft: 10,
                paddingRight: 13,
                marginLeft: 37,
                marginRight: -2,
                marginBottom: 0,
                marginTop: 0,
              }}
              className="bg-[#121828] border border-[#1d273f] rounded-2xl py-2.5 sm:py-3 flex flex-col justify-between shadow-md"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 tracking-wider font-['Orbitron',sans-serif]">
                  SCORE
                </span>
                {combo > 1 ? (
                  <span className="text-[9px] font-bold text-[#f43f5e] bg-[#2d1523] border border-[#4d1f35] px-2 py-0.5 rounded-full flex items-center gap-1 font-['Orbitron',sans-serif] animate-pulse">
                    <span className="text-[8px]">⚡</span> {combo}x COMBO
                  </span>
                ) : (
                  <span className="text-[9px] font-bold text-slate-500 bg-[#161f30] px-2 py-0.5 rounded-full flex items-center gap-1 font-['Orbitron',sans-serif]">
                    <span className="text-[8px]">⚡</span> 1x
                  </span>
                )}
              </div>
              <div className="mt-1 text-xl sm:text-2xl font-black text-white tracking-wide font-['Orbitron',sans-serif]">
                {score.toLocaleString()}
              </div>
            </div>

            {/* Best Score Card */}
            <div
              style={{ marginRight: 39, marginLeft: -4 }}
              className="bg-[#121828] border border-[#1d273f] rounded-2xl px-3.5 py-2.5 sm:px-4 sm:py-3 flex flex-col justify-between shadow-md"
            >
              <div
                style={{ marginLeft: 0, paddingLeft: 0, paddingTop: 0, marginRight: 38 }}
                className="flex items-center justify-between"
              >
                <span
                  style={{ marginLeft: 12 }}
                  className="text-[10px] font-bold text-slate-400 tracking-wider font-['Orbitron',sans-serif]"
                >
                  BEST
                </span>
                <span style={{ marginRight: -25 }} className="text-base">
                  🏆
                </span>
              </div>
              <div
                style={{ marginLeft: 12 }}
                className="mt-1 text-xl sm:text-2xl font-black text-[#f6c445] tracking-wide font-['Orbitron',sans-serif]"
              >
                {bestScore.toLocaleString()}
              </div>
            </div>
          </div>
        </header>

        {/* 8x8 Grid Board with Live Placement Preview */}
        <section
          aria-label="Game Board"
          className="w-full flex-1 flex items-center justify-center my-1.5 min-h-0"
        >
          <div
            ref={boardRef}
            className="w-full max-w-[300px] sm:max-w-[320px] aspect-square bg-[#090d16] p-2 sm:p-2.5 rounded-2xl border border-[#162035] shadow-[inset_0_2px_10px_rgba(0,0,0,0.7)] flex items-center justify-center relative overflow-hidden"
          >
            <div className="grid grid-cols-8 grid-rows-8 gap-1 sm:gap-1.5 w-full h-full">
              {grid.map((row, r) =>
                row.map((cellColor, c) => {
                  const isPreview = isPreviewCell(r, c);
                  const isClearing = clearingCells.has(`${r},${c}`);
                  const activeColor: BlockColor | null = isPreview
                    ? dragging?.piece.color || null
                    : cellColor;

                  const theme = activeColor ? COLOR_THEMES[activeColor] : null;

                  return (
                    <div
                      key={`${r}-${c}`}
                      data-r={r}
                      data-c={c}
                      className={`w-full h-full rounded-[5px] sm:rounded-md flex items-center justify-center transition-all duration-100 ${
                        theme
                          ? isPreview
                            ? `${theme.preview} scale-[0.98] border animate-pulse`
                            : isClearing
                            ? 'bg-white scale-110 shadow-[0_0_18px_#ffffff] z-10 transition-transform'
                            : `${theme.solid} ${theme.shadow} border ${theme.border}`
                          : 'bg-[#101625] border border-[#172034]'
                      }`}
                    />
                  );
                })
              )}
            </div>
          </div>
        </section>

        {/* Block Spawn Area (Piece Tray) */}
        <section aria-label="Piece Tray" className="w-full shrink-0 my-1 sm:my-2">
          <div
            style={{
              marginLeft: 0,
              marginTop: 0,
              marginBottom: 7,
              paddingLeft: 39,
              paddingRight: 39,
            }}
            className="grid grid-cols-3 gap-3 w-full"
          >
            {tray.map((piece, slotIdx) => {
              const isCurrentlyDragging = dragging?.trayIndex === slotIdx;

              return (
                <div
                  key={slotIdx}
                  onPointerDown={(e) => {
                    if (piece) handlePointerDownPiece(e, piece, slotIdx);
                  }}
                  className={`h-20 sm:h-22 rounded-2xl bg-[#101625] border border-[#192237] flex items-center justify-center transition-all ${
                    piece
                      ? 'cursor-grab active:cursor-grabbing hover:border-[#223252]'
                      : ''
                  } ${isCurrentlyDragging ? 'opacity-25 scale-95' : 'opacity-100'}`}
                >
                  {piece ? (
                    renderPieceBlocks(piece)
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-[#192237]" />
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Floating Dragged Piece Overlay */}
        {dragging && (
          <div
            className="fixed pointer-events-none z-50 transition-transform duration-75"
            style={{
              left: dragging.pointerX,
              top: dragging.isTouch ? dragging.pointerY - 70 : dragging.pointerY,
              transform: 'translate(-50%, -50%)',
            }}
          >
            <div
              className="grid gap-[2px]"
              style={{
                gridTemplateColumns: `repeat(${dragging.piece.matrix[0].length}, minmax(0, 1fr))`,
              }}
            >
              {dragging.piece.matrix.map((row, rIdx) =>
                row.map((val, cIdx) => {
                  const theme = COLOR_THEMES[dragging.piece.color];
                  return (
                    <div
                      key={`drag-${rIdx}-${cIdx}`}
                      style={{
                        width: Math.max(draggingCellPx - 2, 28),
                        height: Math.max(draggingCellPx - 2, 28),
                      }}
                      className={`aspect-square flex items-center justify-center ${
                        val === 1
                          ? `rounded-[6px] ${theme.solid} ${theme.shadow} border ${theme.border} shadow-2xl`
                          : 'opacity-0'
                      }`}
                    />
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Bottom Navigation */}
        <nav
          aria-label="Bottom Navigation"
          style={{
            marginLeft: 0,
            paddingLeft: 0,
            paddingTop: 18,
            marginTop: 17,
            paddingBottom: 18,
            paddingRight: 0,
            marginBottom: 17,
          }}
          className="flex items-center justify-around border-t border-[#141d30] shrink-0"
        >
          {/* Play Tab (Active) */}
          <button
            type="button"
            onClick={resetGame}
            className="flex flex-col items-center gap-1 text-[#3debe0] cursor-pointer"
          >
            <div className="w-9 h-9 rounded-xl bg-[#142236] flex items-center justify-center">
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <rect x="3" y="3" width="7" height="7" rx="1.5" />
                <rect x="14" y="3" width="7" height="7" rx="1.5" />
                <rect x="3" y="14" width="7" height="7" rx="1.5" />
                <rect x="14" y="14" width="7" height="7" rx="1.5" />
              </svg>
            </div>
            <span className="text-[9px] font-bold tracking-wider font-['Orbitron',sans-serif]">
              PLAY
            </span>
          </button>

          {/* Rank Tab */}
          <button
            type="button"
            onClick={() => alert(`Best Score: ${bestScore.toLocaleString()}`)}
            className="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-200 cursor-pointer"
          >
            <div className="w-9 h-9 flex items-center justify-center">
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M5 19h3v-6H5v6zm6 0h3V5h-3v14zm6 0h3v-9h-3v9z" />
              </svg>
            </div>
            <span className="text-[9px] font-bold tracking-wider font-['Orbitron',sans-serif]">
              RANK
            </span>
          </button>

          {/* Boosts / Reroll Tab */}
          <button
            type="button"
            onClick={() => setTray(getRandomPieces(3, grid))}
            className="flex flex-col items-center gap-1 text-slate-400 hover:text-[#3debe0] cursor-pointer active:scale-95 transition-all"
            title="Reroll tray pieces"
          >
            <div className="w-9 h-9 flex items-center justify-center">
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z" />
              </svg>
            </div>
            <span className="text-[9px] font-bold tracking-wider font-['Orbitron',sans-serif]">
              REROLL
            </span>
          </button>

          {/* Settings Tab */}
          <button
            type="button"
            onClick={() => setIsPaused(true)}
            className="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-200 cursor-pointer"
          >
            <div className="w-9 h-9 flex items-center justify-center">
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z" />
              </svg>
            </div>
            <span className="text-[9px] font-bold tracking-wider font-['Orbitron',sans-serif]">
              SETTINGS
            </span>
          </button>
        </nav>

        {/* Pause Modal Overlay */}
        {isPaused && (
          <div className="absolute inset-0 bg-[#070a11]/90 backdrop-blur-sm z-40 flex flex-col items-center justify-center p-6 text-center animate-fadeIn">
            <h2 className="text-2xl font-black text-[#3debe0] font-['Black_Ops_One',sans-serif] tracking-wider mb-6">
              GAME PAUSED
            </h2>
            <div className="flex flex-col gap-3 w-48">
              <button
                type="button"
                onClick={() => setIsPaused(false)}
                className="w-full py-3 rounded-xl bg-[#3debe0] text-[#070a11] font-bold tracking-wider hover:bg-[#34d1c6] active:scale-95 transition-all shadow-lg cursor-pointer"
              >
                RESUME
              </button>
              <button
                type="button"
                onClick={resetGame}
                className="w-full py-3 rounded-xl bg-[#141b2e] border border-[#222f4b] text-slate-200 font-bold tracking-wider hover:bg-[#1a253f] active:scale-95 transition-all cursor-pointer"
              >
                RESTART
              </button>
            </div>
          </div>
        )}

        {/* Enhanced High-Impact Ending Screen */}
        {isGameOver && (
          <div className="absolute inset-0 bg-[#070a11]/95 backdrop-blur-md z-40 flex flex-col items-center justify-center p-5 sm:p-6 text-center animate-fadeIn">
            {/* Top Emblem / Record Banner */}
            {isNewRecord && score > 0 ? (
              <div className="flex flex-col items-center mb-3">
                <div className="w-16 h-16 rounded-2xl bg-[#2a220e] border border-[#856417] flex items-center justify-center text-3xl shadow-[0_0_25px_rgba(250,204,21,0.5)] mb-2 animate-bounce">
                  🏆
                </div>
                <span className="px-3 py-1 rounded-full bg-[#facc15]/20 text-[#fde047] border border-[#facc15]/40 text-[10px] font-black tracking-widest uppercase shadow-sm">
                  NEW ALL-TIME RECORD!
                </span>
              </div>
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-[#2d1523] border border-[#522238] flex items-center justify-center text-3xl mb-3 shadow-[0_0_20px_rgba(244,63,94,0.4)]">
                💥
              </div>
            )}

            <h2 className="text-2xl sm:text-3xl font-black text-white font-['Black_Ops_One',sans-serif] tracking-wider mb-1 drop-shadow-[0_0_12px_rgba(255,255,255,0.3)]">
              {isNewRecord && score > 0 ? 'VICTORY RUN' : 'GAME OVER'}
            </h2>
            <p className="text-[11px] text-slate-400 mb-4">No more moves can fit on the board</p>

            {/* Score Showcase Card */}
            <div className="w-full max-w-[280px] bg-[#101726]/90 border border-[#1e2a44] rounded-2xl p-4 mb-4 shadow-[0_4px_24px_rgba(0,0,0,0.5)]">
              {/* Primary Score */}
              <div className="flex flex-col items-center py-1">
                <span className="text-[10px] font-bold text-slate-400 tracking-wider">
                  FINAL SCORE
                </span>
                <span className="text-3xl sm:text-4xl font-black text-[#3debe0] tracking-wide font-['Orbitron',sans-serif] drop-shadow-[0_0_15px_rgba(61,235,224,0.6)] my-1">
                  {score.toLocaleString()}
                </span>
              </div>

              <div className="h-px bg-[#192338] my-2" />

              {/* Stats Grid: Best, Lines Cleared, Max Combo */}
              <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold text-slate-400">BEST</span>
                  <span className="text-sm font-black text-[#f6c445]">
                    {bestScore.toLocaleString()}
                  </span>
                </div>
                <div className="flex flex-col border-x border-[#192338]">
                  <span className="text-[9px] font-bold text-slate-400">LINES</span>
                  <span className="text-sm font-black text-white">
                    {totalLinesCleared}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold text-slate-400">COMBO</span>
                  <span className="text-sm font-black text-[#f43f5e]">
                    {maxCombo > 0 ? `${maxCombo}x` : '1x'}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Button: Play Again */}
            <div className="flex flex-col gap-2.5 w-full max-w-[280px]">
              <button
                type="button"
                onClick={resetGame}
                className="w-full py-3.5 rounded-xl bg-[#3debe0] text-[#070a11] font-black tracking-wider text-xs hover:bg-[#34d1c6] active:scale-95 transition-all shadow-[0_0_20px_rgba(61,235,224,0.45)] cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>🔄</span> PLAY AGAIN
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
