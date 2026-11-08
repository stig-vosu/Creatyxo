/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
  startBackgroundMusic,
  stopBackgroundMusic,
  setBackgroundMusicEnabled,
  setSoundVolume,
  setMusicVolume,
  playSoundVolumePreview,
  unlockAudioContext,
} from './game/audio';
import { HomeScreen } from './components/HomeScreen';
import { LeaderboardScreen } from './components/LeaderboardScreen';
import { NameSetupModal } from './components/NameSetupModal';
import { AudioSettingsModal } from './components/AudioSettingsModal';
import {
  PlayerProfile,
  generateRandomName,
  buildLeaderboard,
  fetchSharedLeaderboard,
  savePlayerToLeaderboard,
} from './game/leaderboard';

export interface FlyingClearMessage {
  id: string;
  multiplier: number;
  points: number;
  accentColor: string;
}

export default function App() {
  // Navigation State: 'home' | 'game' | 'ranking'
  const [activeScreen, setActiveScreen] = useState<'home' | 'game' | 'ranking'>('home');
  const [previousScreen, setPreviousScreen] = useState<'home' | 'game'>('home');

  // Player Profile State (custom names have NO numbers; rolled names do)
  const [playerProfile, setPlayerProfile] = useState<PlayerProfile>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('creatyxo_player_profile');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          // ignore
        }
      }
    }
    const random = generateRandomName();
    return {
      username: random.username,
      tag: random.tag,
      avatarLetter: random.username.charAt(0).toUpperCase(),
      hasChosenName: false,
    };
  });

  // Name setup modal state (opens on first visit if no name chosen yet)
  const [isNameModalOpen, setIsNameModalOpen] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('creatyxo_player_profile');
      if (!saved) return true;
      try {
        const parsed = JSON.parse(saved);
        return !parsed.hasChosenName;
      } catch {
        return true;
      }
    }
    return false;
  });

  // Visual effects & Flying floating combo score messages
  const [flyingMessages, setFlyingMessages] = useState<FlyingClearMessage[]>([]);
  const [clearingRows, setClearingRows] = useState<number[]>([]);
  const [clearingCols, setClearingCols] = useState<number[]>([]);
  const [isBoardShaking, setIsBoardShaking] = useState<boolean>(false);

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

  // Audio States (Independent Sound FX & Chill Background Music with Loudness Adjustments)
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('creatyxo_sound_enabled');
      return saved !== null ? saved === 'true' : true;
    }
    return true;
  });
  const [musicEnabled, setMusicEnabled] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('creatyxo_music_enabled');
      return saved !== null ? saved === 'true' : true;
    }
    return true;
  });
  const [soundVolume, setSoundVolumeState] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('creatyxo_sound_volume');
      return saved !== null ? Math.max(0, Math.min(1, parseFloat(saved))) : 0.8;
    }
    return 0.8;
  });
  const [musicVolume, setMusicVolumeState] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('creatyxo_music_volume');
      return saved !== null ? Math.max(0, Math.min(1, parseFloat(saved))) : 0.8;
    }
    return 0.8;
  });
  const [isAudioSettingsOpen, setIsAudioSettingsOpen] = useState<boolean>(false);

  // Synchronize initial audio volume levels & unlock audio on first user gesture
  useEffect(() => {
    setSoundVolume(soundVolume);
    setMusicVolume(musicVolume);

    const handleFirstUserInteraction = () => {
      unlockAudioContext();
      window.removeEventListener('pointerdown', handleFirstUserInteraction);
      window.removeEventListener('keydown', handleFirstUserInteraction);
      window.removeEventListener('touchstart', handleFirstUserInteraction);
    };

    window.addEventListener('pointerdown', handleFirstUserInteraction, { passive: true });
    window.addEventListener('keydown', handleFirstUserInteraction, { passive: true });
    window.addEventListener('touchstart', handleFirstUserInteraction, { passive: true });

    return () => {
      window.removeEventListener('pointerdown', handleFirstUserInteraction);
      window.removeEventListener('keydown', handleFirstUserInteraction);
      window.removeEventListener('touchstart', handleFirstUserInteraction);
    };
  }, []);

  const handleSoundVolumeChange = useCallback((val: number) => {
    const clamped = Math.max(0, Math.min(1, val));
    setSoundVolumeState(clamped);
    setSoundVolume(clamped);
    if (clamped > 0 && !soundEnabled) {
      setSoundEnabled(true);
      try {
        localStorage.setItem('creatyxo_sound_enabled', 'true');
      } catch {
        // ignore
      }
    }
    try {
      localStorage.setItem('creatyxo_sound_volume', clamped.toString());
    } catch {
      // ignore
    }
  }, [soundEnabled]);

  const handleMusicVolumeChange = useCallback((val: number) => {
    const clamped = Math.max(0, Math.min(1, val));
    setMusicVolumeState(clamped);
    setMusicVolume(clamped);
    if (clamped > 0 && !musicEnabled) {
      setMusicEnabled(true);
      setBackgroundMusicEnabled(true);
      try {
        localStorage.setItem('creatyxo_music_enabled', 'true');
      } catch {
        // ignore
      }
    }
    try {
      localStorage.setItem('creatyxo_music_volume', clamped.toString());
    } catch {
      // ignore
    }
  }, [musicEnabled]);

  const toggleSound = useCallback(() => {
    setSoundEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('creatyxo_sound_enabled', next.toString());
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

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

  const savePlayerProfile = (profile: PlayerProfile) => {
    setPlayerProfile(profile);
    setIsNameModalOpen(false);
    try {
      localStorage.setItem('creatyxo_player_profile', JSON.stringify(profile));
      savePlayerToLeaderboard(profile, bestScore);
    } catch {
      // ignore
    }
  };

  // Toggle Background Music
  const toggleMusic = useCallback(() => {
    setMusicEnabled((prev) => {
      const next = !prev;
      setBackgroundMusicEnabled(next);
      try {
        localStorage.setItem('creatyxo_music_enabled', next.toString());
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  // Sync best score to localStorage and save to shared global leaderboard
  useEffect(() => {
    if (score > bestScore) {
      setBestScore(score);
      setIsNewRecord(true);
      try {
        localStorage.setItem('creatyxo_best_score', score.toString());
        savePlayerToLeaderboard(playerProfile, score).catch(() => {});
      } catch {
        // Ignore
      }
    }
  }, [score, bestScore, playerProfile]);

  // Initial sync: Ensure any existing best score is pushed to the global leaderboard
  useEffect(() => {
    if (bestScore > 0) {
      savePlayerToLeaderboard(playerProfile, bestScore).catch(() => {});
    }
  }, []);

  // Compute player global rank from shared leaderboard
  const [userRank, setUserRank] = useState<number>(() => {
    return buildLeaderboard(playerProfile, bestScore).userRank;
  });

  useEffect(() => {
    fetchSharedLeaderboard(playerProfile, bestScore)
      .then((data) => {
        if (data && typeof data.userRank === 'number') {
          setUserRank(data.userRank);
        }
      })
      .catch(() => {});
  }, [playerProfile, bestScore]);

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

  const openLeaderboard = (from: 'home' | 'game') => {
    setPreviousScreen(from);
    setActiveScreen('ranking');
  };

  // Start game flow directly
  const handleStartGame = () => {
    if (musicEnabled) {
      startBackgroundMusic(true);
    }
    setActiveScreen('game');
  };

  /**
   * Measures the exact rendered pixel width and spacing of board squares
   * so dragging blocks match the board squares 1:1 with zero size mismatch.
   */
  const getBoardCellMetrics = useCallback(() => {
    const boardEl = boardRef.current;
    if (!boardEl) return { cellPx: 32, gapPx: 4, originLeft: 0, originTop: 0 };

    const firstCell = boardEl.querySelector('[data-r="0"][data-c="0"]') as HTMLElement | null;
    const secondCell = boardEl.querySelector('[data-r="0"][data-c="1"]') as HTMLElement | null;

    if (firstCell) {
      const rect = firstCell.getBoundingClientRect();
      const gapPx = secondCell ? secondCell.getBoundingClientRect().left - rect.right : 4;
      return {
        cellPx: rect.width,
        gapPx: Math.max(4, Math.round(gapPx)),
        originLeft: rect.left,
        originTop: rect.top,
      };
    }

    const rect = boardEl.getBoundingClientRect();
    const innerWidth = rect.width - 20; // 10px board padding
    const gapPx = 4;
    const cellPx = (innerWidth - 7 * gapPx) / 8;
    return {
      cellPx,
      gapPx,
      originLeft: rect.left + 10,
      originTop: rect.top + 10,
    };
  }, []);

  // Compute placement coordinate based on pointer coordinates
  const calculateTargetPlacement = useCallback(
    (pointerX: number, pointerY: number, piece: PieceShape): PlacementCoordinate | null => {
      const boardEl = boardRef.current;
      if (!boardEl) return null;

      const { cellPx, gapPx, originLeft, originTop } = getBoardCellMetrics();
      const stride = cellPx + gapPx;

      const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const effectiveY = isMobile ? pointerY - 75 : pointerY;

      const pieceRows = piece.matrix.length;
      const pieceCols = piece.matrix[0].length;

      const visualAnchorR = (pieceRows - 1) / 2;
      const visualAnchorC = (pieceCols - 1) / 2;

      const relativeX = pointerX - originLeft;
      const relativeY = effectiveY - originTop;

      const floatCol = relativeX / stride;
      const floatRow = relativeY / stride;

      const targetR = Math.round(floatRow - visualAnchorR);
      const targetC = Math.round(floatCol - visualAnchorC);

      if (canPlacePiece(gridRef.current, piece, targetR, targetC)) {
        return { r: targetR, c: targetC };
      }

      // Proximity snap
      let bestPlacement: PlacementCoordinate | null = null;
      let minDistance = Infinity;

      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const testR = targetR + dr;
          const testC = targetC + dc;
          if (canPlacePiece(gridRef.current, piece, testR, testC)) {
            const centerR = testR + visualAnchorR;
            const centerC = testC + visualAnchorC;
            const distSq = (centerR - floatRow) ** 2 + (centerC - floatCol) ** 2;
            if (distSq < minDistance && distSq < 1.7) {
              minDistance = distSq;
              bestPlacement = { r: testR, c: testC };
            }
          }
        }
      }

      return bestPlacement;
    },
    [getBoardCellMetrics]
  );

  // Global Pointer Listeners for Smooth Drag and Drop
  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (!draggingRef.current) return;
      e.preventDefault();

      const current = draggingRef.current;
      setDragging({
        ...current,
        pointerX: e.clientX,
        pointerY: e.clientY,
      });

      const placement = calculateTargetPlacement(e.clientX, e.clientY, current.piece);
      setPreviewPlacement(placement);
    };

    const handlePointerUp = () => {
      const currentDragging = draggingRef.current;
      if (!currentDragging) return;

      const boardEl = boardRef.current;
      const placement = calculateTargetPlacement(
        currentDragging.pointerX,
        currentDragging.pointerY,
        currentDragging.piece
      );

      if (boardEl && placement) {
        const { piece, trayIndex } = currentDragging;
        const targetR = placement.r;
        const targetC = placement.c;

        const newGrid = gridRef.current.map((row) => [...row]);
        const pieceRows = piece.matrix.length;
        const pieceCols = piece.matrix[0].length;
        let placedBlockCount = 0;

        for (let r = 0; r < pieceRows; r++) {
          for (let c = 0; c < pieceCols; c++) {
            if (piece.matrix[r][c] === 1) {
              newGrid[targetR + r][targetC + c] = piece.color;
              placedBlockCount++;
            }
          }
        }

        const nextTray = [...trayRef.current];
        nextTray[trayIndex] = null;

        const rowsToClear: number[] = [];
        for (let r = 0; r < 8; r++) {
          if (newGrid[r].every((cell) => cell !== null)) {
            rowsToClear.push(r);
          }
        }

        const colsToClear: number[] = [];
        for (let c = 0; c < 8; c++) {
          let full = true;
          for (let r = 0; r < 8; r++) {
            if (newGrid[r][c] === null) {
              full = false;
              break;
            }
          }
          if (full) {
            colsToClear.push(c);
          }
        }

        const linesCleared = rowsToClear.length + colsToClear.length;
        const basePoints = placedBlockCount * 10;

        if (linesCleared > 0) {
          const cellsMarked = new Set<string>();
          rowsToClear.forEach((r) => {
            for (let c = 0; c < 8; c++) cellsMarked.add(`${r},${c}`);
          });
          colsToClear.forEach((c) => {
            for (let r = 0; r < 8; r++) cellsMarked.add(`${r},${c}`);
          });

          setClearingCells(cellsMarked);
          setClearingRows(rowsToClear);
          setClearingCols(colsToClear);
          setIsBoardShaking(true);

          rowsToClear.forEach((r) => {
            for (let c = 0; c < 8; c++) {
              newGrid[r][c] = null;
            }
          });
          colsToClear.forEach((c) => {
            for (let r = 0; r < 8; r++) {
              newGrid[r][c] = null;
            }
          });

          const nextCombo = combo + 1;
          setCombo(nextCombo);
          setMaxCombo((prev) => Math.max(prev, nextCombo));
          setTotalLinesCleared((prev) => prev + linesCleared);

          playClearSound(nextCombo, linesCleared, soundEnabled);

          // Rich Multiplier Calculations:
          // 1. Line Clear Multiplier: 1 line = 150 pts, 2 lines = 450 pts (2x), 3 lines = 900 pts (3.5x), 4+ lines = 1600 pts (5x)
          let baseLinePoints = 150;
          let clearTitle = 'SINGLE CLEAR';
          if (linesCleared === 2) {
            baseLinePoints = 450;
            clearTitle = 'DOUBLE CLEAR! 2x';
          } else if (linesCleared === 3) {
            baseLinePoints = 900;
            clearTitle = 'TRIPLE BLAST! 3x';
          } else if (linesCleared >= 4) {
            baseLinePoints = 1600;
            clearTitle = 'MEGA CRUSH! 5x';
          }

          // 2. Consecutive Combo Multiplier: 1x, 1.5x, 2.0x, 2.5x, 3.0x, etc.
          const comboMultiplier = 1 + Math.max(0, nextCombo - 1) * 0.5;
          const clearScore = Math.round(baseLinePoints * comboMultiplier);
          const totalPointsGained = basePoints + clearScore;

          setScore((prev) => prev + totalPointsGained);

          // 3. Spawn Flying Message showing ONLY the multiplier (1x, 2x, 3x...) and points number
          const msgId = `${Date.now()}-${Math.random()}`;
          const currentMultiplier = Math.max(1, linesCleared, nextCombo);
          const newMsg: FlyingClearMessage = {
            id: msgId,
            multiplier: currentMultiplier,
            points: totalPointsGained,
            accentColor:
              currentMultiplier >= 3
                ? '#f43f5e'
                : currentMultiplier === 2
                ? '#f6c445'
                : '#3debe0',
          };

          setFlyingMessages((prev) => [...prev.slice(-2), newMsg]);
          setTimeout(() => {
            setFlyingMessages((prev) => prev.filter((m) => m.id !== msgId));
          }, 1400);

          setTimeout(() => {
            setClearingCells(new Set());
            setClearingRows([]);
            setClearingCols([]);
          }, 380);

          setTimeout(() => {
            setIsBoardShaking(false);
          }, 360);
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
          savePlayerToLeaderboard(playerProfile, Math.max(score, bestScore)).catch(() => {});
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
  }, [calculateTargetPlacement, combo, soundEnabled]);

  // Pointer Down on Tray Piece
  const handlePointerDownPiece = (
    e: React.PointerEvent<HTMLDivElement>,
    piece: PieceShape,
    trayIndex: number
  ) => {
    e.preventDefault();
    if (isGameOver || isPaused) return;

    playPickSound(soundEnabled);

    setDragging({
      piece,
      trayIndex,
      pointerX: e.clientX,
      pointerY: e.clientY,
      isTouch: e.pointerType === 'touch',
    });

    const placement = calculateTargetPlacement(e.clientX, e.clientY, piece);
    setPreviewPlacement(placement);
  };

  // Check if a cell is part of preview placement
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

  // Render static piece preview inside slot
  const renderMiniPiece = (piece: PieceShape) => {
    const theme = COLOR_THEMES[piece.color];
    const rows = piece.matrix.length;
    const cols = piece.matrix[0].length;

    let cellPx = 18;
    if (rows > 3 || cols > 3) cellPx = 13;
    else if (rows === 1 && cols === 1) cellPx = 24;

    return (
      <div
        className="grid gap-1 pointer-events-none select-none transition-transform"
        style={{
          gridTemplateRows: `repeat(${rows}, ${cellPx}px)`,
          gridTemplateColumns: `repeat(${cols}, ${cellPx}px)`,
        }}
      >
        {piece.matrix.map((row, r) =>
          row.map((cell, c) => (
            <div
              key={`${r}-${c}`}
              className={`rounded-[3px] transition-all ${
                cell === 1
                  ? `${theme.solid} ${theme.shadow} border ${theme.border}`
                  : 'bg-transparent'
              }`}
              style={{ width: `${cellPx}px`, height: `${cellPx}px` }}
            />
          ))
        )}
      </div>
    );
  };

  // Render dragging piece matching the board square size 1:1 and clamped >= 10px from screen border
  const renderFloatingDraggingPiece = () => {
    if (!dragging) return null;
    const { piece, pointerX, pointerY, isTouch } = dragging;
    const theme = COLOR_THEMES[piece.color];
    const rows = piece.matrix.length;
    const cols = piece.matrix[0].length;

    const { cellPx, gapPx } = getBoardCellMetrics();
    const effectiveGap = Math.max(4, gapPx);
    const pieceW = cols * cellPx + (cols - 1) * effectiveGap;
    const pieceH = rows * cellPx + (rows - 1) * effectiveGap;
    const halfW = pieceW / 2;
    const halfH = pieceH / 2;
    const touchOffset = isTouch ? 75 : 0;
    const targetY = pointerY - touchOffset;

    // Guarantee dragging block is at least 10px away from the screen border
    const clampedX = Math.max(10 + halfW, Math.min(window.innerWidth - 10 - halfW, pointerX));
    const clampedY = Math.max(10 + halfH, Math.min(window.innerHeight - 10 - halfH, targetY));

    return (
      <div
        className="fixed pointer-events-none z-50 select-none -translate-x-1/2 -translate-y-1/2"
        style={{
          left: `${clampedX}px`,
          top: `${clampedY}px`,
        }}
      >
        <div
          className="grid filter drop-shadow-[0_8px_16px_rgba(0,0,0,0.85)] scale-100"
          style={{
            gridTemplateRows: `repeat(${rows}, ${cellPx}px)`,
            gridTemplateColumns: `repeat(${cols}, ${cellPx}px)`,
            gap: `${effectiveGap}px`,
          }}
        >
          {piece.matrix.map((row, r) =>
            row.map((cell, c) => (
              <div
                key={`drag-${r}-${c}`}
                className={`rounded-[5px] sm:rounded-md transition-all ${
                  cell === 1
                    ? `${theme.solid} ${theme.shadow} border ${theme.border}`
                    : 'bg-transparent'
                }`}
                style={{ width: `${cellPx}px`, height: `${cellPx}px` }}
              />
            ))
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full h-full h-[100dvh] max-h-[100dvh] bg-[#070a11] text-slate-100 flex flex-col items-center justify-center select-none font-['Orbitron',sans-serif] overflow-hidden p-3 sm:p-5 touch-none">
      {/* Name Setup / Callsign Modal */}
      <NameSetupModal
        isOpen={isNameModalOpen}
        currentProfile={playerProfile}
        onSave={savePlayerProfile}
        onClose={() => setIsNameModalOpen(false)}
        isInitialSetup={!playerProfile.hasChosenName}
      />

      {/* Audio Settings & Volume Sliders Modal */}
      <AudioSettingsModal
        isOpen={isAudioSettingsOpen}
        soundEnabled={soundEnabled}
        musicEnabled={musicEnabled}
        soundVolume={soundVolume}
        musicVolume={musicVolume}
        onToggleSound={toggleSound}
        onToggleMusic={toggleMusic}
        onChangeSoundVolume={handleSoundVolumeChange}
        onChangeMusicVolume={handleMusicVolumeChange}
        onClose={() => setIsAudioSettingsOpen(false)}
      />

      {/* Main Container: Well inset from screen edges on all devices */}
      <main
        className="w-full max-w-[440px] h-full sm:h-[840px] sm:max-h-[96vh] rounded-2xl sm:rounded-3xl border border-[#1b263d] shadow-2xl flex flex-col mx-auto relative bg-[#070a11] overflow-hidden p-3.5 sm:p-6 justify-between"
      >
        {/* VIEW 1: HOME SCREEN */}
        {activeScreen === 'home' && (
          <HomeScreen
            playerProfile={playerProfile}
            bestScore={bestScore}
            userRank={userRank}
            soundEnabled={soundEnabled}
            musicEnabled={musicEnabled}
            onToggleSound={toggleSound}
            onToggleMusic={toggleMusic}
            onOpenAudioSettings={() => setIsAudioSettingsOpen(true)}
            onStartGame={handleStartGame}
            onOpenLeaderboard={() => openLeaderboard('home')}
            onOpenNameModal={() => setIsNameModalOpen(true)}
          />
        )}

        {/* VIEW 2: LEADERBOARD SCREEN */}
        {activeScreen === 'ranking' && (
          <LeaderboardScreen
            playerProfile={playerProfile}
            bestScore={bestScore}
            onBack={() => setActiveScreen(previousScreen)}
            onPlayGame={() => setActiveScreen('game')}
            onOpenNameModal={() => setIsNameModalOpen(true)}
          />
        )}

        {/* VIEW 3: GAMEPLAY SCREEN */}
        {activeScreen === 'game' && (
          <>
            {/* Top Header Section: Corner buttons have 10px margin away from screen border */}
            <header className="flex flex-col gap-3 w-full shrink-0 px-1 sm:px-2 pt-1">
              {/* Top Bar: Home, Title, Settings */}
              <div className="flex items-center justify-between w-full">
                {/* Home Return Button (Top Left Corner: 10px margin from screen border, 4px from neighbors) */}
                <button
                  type="button"
                  aria-label="Return to Home"
                  onClick={() => setActiveScreen('home')}
                  style={{ marginLeft: 10, marginTop: 10, marginRight: 4, marginBottom: 4 }}
                  className="btn-creatyxo-icon rounded-xl bg-[#121828] border border-[#1b263d] text-slate-300 hover:text-[#3debe0] hover:border-[#3debe0]/50 active:scale-95 transition-all cursor-pointer shadow-sm shrink-0"
                  title="Main Menu"
                >
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                    <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
                  </svg>
                </button>

                <h1
                  className="text-xl sm:text-2xl tracking-wider text-[#3debe0] uppercase font-['Black_Ops_One',sans-serif] drop-shadow-[0_0_16px_rgba(61,235,224,0.35)] text-center px-2 select-none cursor-pointer flex items-center justify-center"
                  onClick={() => setActiveScreen('home')}
                  title="Main Menu"
                >
                  CREATYXO
                </h1>

                {/* Settings Button (Top Right Corner: 10px margin from screen border, 4px from neighbors) */}
                <button
                  type="button"
                  aria-label="Settings, Sound & Music"
                  onClick={() => setIsAudioSettingsOpen(true)}
                  style={{
                    padding: 8,
                    marginLeft: 4,
                    marginRight: 10,
                    marginTop: 10,
                    marginBottom: 4,
                  }}
                  className="btn-creatyxo-icon rounded-xl border border-[#1b263d] bg-[#121828] text-slate-400 hover:text-[#3debe0] hover:border-[#3debe0]/50 cursor-pointer active:scale-95 transition-all shadow-sm shrink-0"
                  title="Settings (Music & Sound)"
                >
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                    <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
                  </svg>
                </button>
              </div>

              {/* Score Cards Row: 12px gap */}
              <div className="grid grid-cols-2 gap-3 w-full">
                {/* Score Card */}
                <div
                  style={{ marginLeft: 15, marginRight: 0 }}
                  className="bg-[#101625] border border-[#1b263d] rounded-2xl px-3.5 py-2.5 flex flex-col justify-center gap-1 shadow-sm min-h-[58px]"
                >
                  <div style={{ paddingLeft: 7 }} className="flex items-center justify-between">
                    <span className="text-[9.5px] font-bold text-slate-400 tracking-wider font-['Orbitron',sans-serif] leading-normal">
                      SCORE
                    </span>
                    {combo > 1 ? (
                      <span
                        style={{ paddingRight: 0, paddingLeft: 0, marginLeft: 0, marginRight: 9 }}
                        className="text-[8px] font-bold text-[#f43f5e] bg-[#2d1523] border border-[#4d1f35] py-0.5 rounded-full font-['Orbitron',sans-serif] leading-normal"
                      >
                        COMBO {combo}x
                      </span>
                    ) : (
                      <span
                        style={{ paddingRight: 0, paddingLeft: 0, marginLeft: 0, marginRight: 9 }}
                        className="text-[8px] font-bold text-slate-500 bg-[#141b2e] py-0.5 rounded-full font-['Orbitron',sans-serif] leading-normal"
                      >
                        1x
                      </span>
                    )}
                  </div>
                  <div
                    style={{ marginLeft: 0, paddingLeft: 5 }}
                    className="text-lg sm:text-xl font-black text-white tracking-wide font-['Orbitron',sans-serif] leading-normal tabular-nums"
                  >
                    {score.toLocaleString()}
                  </div>
                </div>

                {/* Best Score Card */}
                <div
                  style={{ paddingRight: 10 }}
                  className="bg-[#101625] border border-[#1b263d] rounded-2xl px-3.5 py-2.5 flex flex-col justify-center gap-1 shadow-sm min-h-[58px]"
                >
                  <div className="flex items-center justify-between">
                    <span
                      style={{ paddingLeft: 8 }}
                      className="text-[9.5px] font-bold text-slate-400 tracking-wider font-['Orbitron',sans-serif] leading-normal"
                    >
                      BEST
                    </span>
                    <span className="text-[9.5px] text-slate-500 font-bold font-['Orbitron',sans-serif] leading-normal">
                      #{userRank}
                    </span>
                  </div>
                  <div
                    style={{ paddingLeft: 5 }}
                    className="text-lg sm:text-xl font-black text-[#f6c445] tracking-wide font-['Orbitron',sans-serif] leading-normal tabular-nums"
                  >
                    {bestScore.toLocaleString()}
                  </div>
                </div>
              </div>
            </header>

            {/* Center Playfield: Game Board + Block Spawning Tray */}
            <div className="w-full flex-1 flex flex-col items-center justify-center gap-3 sm:gap-4 my-auto min-h-0">
              {/* Game Board */}
              <section
                aria-label="Game Board"
                className="w-full flex items-center justify-center"
              >
                <div
                  ref={boardRef}
                  style={{
                    width: '100%',
                    maxWidth: 310,
                    aspectRatio: '1 / 1',
                    backgroundColor: '#090d16',
                    padding: 10,
                    borderRadius: 18,
                    border: '1px solid #162035',
                    boxShadow: 'inset 0 2px 10px rgba(0, 0, 0, 0.7)',
                  }}
                  className={`relative select-none touch-none ${isBoardShaking ? 'animate-board-shake' : ''}`}
                >
                  <div className="grid grid-cols-8 grid-rows-8 gap-1 sm:gap-1.5 w-full h-full relative">
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
                              isClearing
                                ? 'animate-cell-blast z-20'
                                : theme
                                ? isPreview
                                  ? `${theme.preview} scale-[0.98] border animate-pulse`
                                  : `${theme.solid} ${theme.shadow} border ${theme.border}`
                                : 'bg-[#101625] border border-[#172034]'
                            }`}
                          />
                        );
                      })
                    )}
                  </div>

                  {/* Laser Beams sweeping across cleared Rows */}
                  {clearingRows.map((r) => (
                    <div
                      key={`laser-r-${r}`}
                      className="absolute left-2.5 right-2.5 pointer-events-none z-30 animate-laser-row h-7 rounded-sm bg-gradient-to-r from-transparent via-white to-transparent shadow-[0_0_28px_#3debe0]"
                      style={{
                        top: `calc(${r * 12.5}% + 10px)`,
                        transformOrigin: 'left center',
                      }}
                    />
                  ))}

                  {/* Laser Beams sweeping across cleared Columns */}
                  {clearingCols.map((c) => (
                    <div
                      key={`laser-c-${c}`}
                      className="absolute top-2.5 bottom-2.5 pointer-events-none z-30 animate-laser-col w-7 rounded-sm bg-gradient-to-b from-transparent via-white to-transparent shadow-[0_0_28px_#3debe0]"
                      style={{
                        left: `calc(${c * 12.5}% + 10px)`,
                        transformOrigin: 'center top',
                      }}
                    />
                  ))}

                  {/* Flying Floating Score & Multiplier Popups - Pure sharp typography, zero box or border */}
                  {flyingMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className="absolute left-1/2 top-1/2 pointer-events-none z-40 animate-flying-score flex flex-col items-center justify-center text-center select-none"
                    >
                      <span
                        className="text-2xl sm:text-3xl font-black font-['Orbitron',sans-serif] tracking-wider leading-none"
                        style={{
                          color: msg.accentColor,
                          textShadow: `0 2px 5px rgba(0,0,0,0.95), 0 0 10px rgba(0,0,0,0.85), 0 0 16px ${msg.accentColor}`,
                        }}
                      >
                        {msg.multiplier}x
                      </span>
                      <span
                        className="text-xl sm:text-2xl font-black text-white font-['Orbitron',sans-serif] tracking-wide leading-tight tabular-nums mt-0.5"
                        style={{
                          textShadow: '0 2px 5px rgba(0,0,0,0.95), 0 0 10px rgba(0,0,0,0.85), 0 0 14px rgba(255,255,255,0.7)',
                        }}
                      >
                        +{msg.points}
                      </span>
                    </div>
                  ))}
                </div>
              </section>

              {/* Block Spawn Area (Piece Tray) */}
              <section aria-label="Piece Tray" className="w-full flex items-center justify-center">
                <div className="grid grid-cols-3 gap-3 w-full max-w-[310px]">
                  {tray.map((piece, slotIdx) => {
                    const isCurrentlyDragging = dragging?.trayIndex === slotIdx;

                    return (
                      <div
                        key={slotIdx}
                        data-tray-slot={slotIdx}
                        style={{
                          height: 80,
                          borderRadius: 16,
                          backgroundColor: '#101625',
                          border: '1px solid #192237',
                        }}
                        className="flex items-center justify-center relative touch-none select-none transition-transform active:scale-95 cursor-grab hover:border-[#223150]"
                        onPointerDown={(e) => {
                          if (piece) handlePointerDownPiece(e, piece, slotIdx);
                        }}
                      >
                        {piece && !isCurrentlyDragging && renderMiniPiece(piece)}
                        {!piece && (
                          <span className="w-2 h-2 rounded-full bg-[#192237]" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>

            {/* Bottom Navigation: Inset 10px from screen border with at least 4px separation between elements */}
            <nav
              className="w-full flex items-center justify-around border-t border-[#141d30] pt-2 pb-2 px-2 sm:px-4 shrink-0 gap-2 mb-2.5"
              aria-label="Navigation"
            >
              {/* Play Tab (Bottom Left Corner: 10px margin from screen border) */}
              <button
                type="button"
                onClick={() => setActiveScreen('game')}
                style={{ marginLeft: 10, marginBottom: 10, marginRight: 4, marginTop: 2 }}
                className="flex-1 max-w-[88px] min-h-[44px] py-1 px-1.5 rounded-xl flex flex-col items-center justify-center text-center gap-1.5 text-[#3debe0] cursor-pointer hover:bg-[#142036]/50 transition-colors box-border"
              >
                <div className="w-5 h-5 rounded-lg bg-[#142236] flex items-center justify-center shrink-0">
                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                    <rect x="3" y="3" width="7" height="7" rx="1.5" />
                    <rect x="14" y="3" width="7" height="7" rx="1.5" />
                    <rect x="3" y="14" width="7" height="7" rx="1.5" />
                    <rect x="14" y="14" width="7" height="7" rx="1.5" />
                  </svg>
                </div>
                <span className="text-[9px] font-bold tracking-wider font-['Orbitron',sans-serif] leading-normal text-center">
                  PLAY
                </span>
              </button>

              {/* Rank Tab */}
              <button
                type="button"
                onClick={() => openLeaderboard('game')}
                style={{ marginBottom: 10, marginLeft: 4, marginRight: 4, marginTop: 2 }}
                className="flex-1 max-w-[88px] min-h-[44px] py-1 px-1.5 rounded-xl flex flex-col items-center justify-center text-center gap-1.5 text-slate-400 hover:text-[#3debe0] cursor-pointer hover:bg-[#142036]/50 active:scale-95 transition-all box-border"
                title="View Leaderboard"
              >
                <div className="w-5 h-5 flex items-center justify-center shrink-0">
                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                    <path d="M5 19h3v-6H5v6zm6 0h3V5h-3v14zm6 0h3v-9h-3v9z" />
                  </svg>
                </div>
                <span className="text-[9px] font-bold tracking-wider font-['Orbitron',sans-serif] leading-normal text-center">
                  RANK
                </span>
              </button>

              {/* Settings / Pause Tab (Bottom Right Corner: 10px margin from screen border) */}
              <button
                type="button"
                onClick={() => setIsPaused(true)}
                style={{ marginRight: 10, marginBottom: 10, marginLeft: 4, marginTop: 2 }}
                className="flex-1 max-w-[88px] min-h-[44px] py-1 px-1.5 rounded-xl flex flex-col items-center justify-center text-center gap-1.5 text-slate-400 hover:text-slate-200 cursor-pointer hover:bg-[#142036]/50 transition-colors box-border"
              >
                <div className="w-5 h-5 flex items-center justify-center shrink-0">
                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                    <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
                  </svg>
                </div>
                <span className="text-[9px] font-bold tracking-wider font-['Orbitron',sans-serif] leading-normal text-center">
                  SETTINGS
                </span>
              </button>
            </nav>

            {/* Pause / Settings Modal Overlay */}
            {isPaused && (
              <div className="absolute inset-0 bg-[#070a11]/90 backdrop-blur-sm z-40 flex flex-col items-center justify-center p-4 sm:p-6 text-center animate-fadeIn select-none">
                <div className="w-full max-w-[340px] bg-[#0c1220] border border-[#1b263d] rounded-2xl p-4 sm:p-6 shadow-2xl flex flex-col gap-3.5">
                  <div className="flex items-center justify-between border-b border-[#172238] pb-3 px-1">
                    <h2 className="text-sm font-black text-white font-['Orbitron',sans-serif] tracking-wider leading-normal">
                      GAME PAUSED
                    </h2>
                    <span className="text-[10px] text-[#3debe0] font-['Orbitron',sans-serif] font-bold leading-normal">
                      SETTINGS
                    </span>
                  </div>

                  {/* Audio Volume Controls (Directly accessible in Pause) */}
                  <div className="bg-[#101726] border border-[#19243a] rounded-xl p-3.5 flex flex-col gap-3 text-left">
                    {/* Music Loudness */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-bold text-slate-300 font-['Orbitron',sans-serif] flex items-center gap-1.5">
                          <svg className="w-3.5 h-3.5 text-[#3debe0] fill-current" viewBox="0 0 24 24">
                            <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                          </svg>
                          MUSIC
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black text-[#3debe0] font-['Orbitron',sans-serif] tabular-nums">
                            {Math.round(musicVolume * 100)}%
                          </span>
                          <button
                            type="button"
                            onClick={toggleMusic}
                            className={`min-h-[52px] px-6 py-[14px] rounded-xl border font-['Orbitron',sans-serif] cursor-pointer transition-colors text-xs font-bold flex items-center justify-center leading-normal box-border ${
                              musicEnabled
                                ? 'bg-[#17303d] border-[#3debe0]/60 text-[#3debe0]'
                                : 'bg-[#181f2f] border-[#25324b] text-slate-500'
                            }`}
                          >
                            {musicEnabled ? 'ON' : 'OFF'}
                          </button>
                        </div>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="1"
                        value={Math.round(musicVolume * 100)}
                        onChange={(e) => handleMusicVolumeChange(parseFloat(e.target.value) / 100)}
                        className="cyber-slider w-full"
                        aria-label="Adjust background music loudness"
                      />
                    </div>

                    {/* Sound FX Loudness */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-bold text-slate-300 font-['Orbitron',sans-serif] flex items-center gap-1.5">
                          <svg className="w-3.5 h-3.5 text-[#3debe0] fill-current" viewBox="0 0 24 24">
                            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
                          </svg>
                          SOUND FX
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black text-[#3debe0] font-['Orbitron',sans-serif] tabular-nums">
                            {Math.round(soundVolume * 100)}%
                          </span>
                          <button
                            type="button"
                            onClick={toggleSound}
                            className={`min-h-[52px] px-6 py-[14px] rounded-xl border font-['Orbitron',sans-serif] cursor-pointer transition-colors text-xs font-bold flex items-center justify-center leading-normal box-border ${
                              soundEnabled
                                ? 'bg-[#17303d] border-[#3debe0]/60 text-[#3debe0]'
                                : 'bg-[#181f2f] border-[#25324b] text-slate-500'
                            }`}
                          >
                            {soundEnabled ? 'ON' : 'OFF'}
                          </button>
                        </div>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="1"
                        value={Math.round(soundVolume * 100)}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) / 100;
                          handleSoundVolumeChange(val);
                          playSoundVolumePreview(val);
                        }}
                        className="cyber-slider w-full"
                        aria-label="Adjust sound effects loudness"
                      />
                    </div>
                  </div>

                  {/* Navigation Actions: 12px gap, at least 4px separation */}
                  <div className="flex flex-col gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsPaused(false)}
                      className="btn-creatyxo w-full rounded-2xl bg-[#3debe0] hover:bg-[#34d1c6] text-[#070a11] font-black tracking-wider text-xs sm:text-sm font-['Orbitron',sans-serif] shadow-[0_0_16px_rgba(61,235,224,0.35)] active:scale-95 transition-all cursor-pointer m-1"
                    >
                      RESUME
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsPaused(false);
                        openLeaderboard('game');
                      }}
                      className="btn-creatyxo w-full rounded-xl bg-[#141b2e] border border-[#222f4b] hover:border-[#3debe0]/40 text-slate-200 hover:text-white font-bold tracking-wider text-xs font-['Orbitron',sans-serif] hover:bg-[#1a253f] active:scale-95 transition-all cursor-pointer m-1"
                    >
                      LEADERBOARD
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsPaused(false);
                        setActiveScreen('home');
                      }}
                      className="btn-creatyxo w-full rounded-xl bg-[#141b2e] border border-[#222f4b] hover:border-[#3debe0]/40 text-slate-200 hover:text-white font-bold tracking-wider text-xs font-['Orbitron',sans-serif] hover:bg-[#1a253f] active:scale-95 transition-all cursor-pointer m-1"
                    >
                      HOME SCREEN
                    </button>

                    <button
                      type="button"
                      onClick={resetGame}
                      className="btn-creatyxo w-full rounded-xl bg-[#141b2e] border border-[#222f4b] hover:border-rose-500/40 text-slate-400 hover:text-rose-300 font-bold tracking-wider text-xs font-['Orbitron',sans-serif] hover:bg-[#1a253f] active:scale-95 transition-all cursor-pointer m-1"
                    >
                      RESTART
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Ending Screen (Clean & Calm) */}
            {isGameOver && (
              <div className="absolute inset-0 bg-[#070a11]/95 backdrop-blur-md z-40 flex flex-col items-center justify-center p-4 sm:p-6 text-center animate-fadeIn select-none">
                {isNewRecord && score > 0 ? (
                  <span className="px-4 py-1.5 rounded-full bg-[#f6c445]/20 text-[#f6c445] border border-[#f6c445]/40 text-[10px] font-bold tracking-widest uppercase mb-3 leading-normal flex items-center justify-center">
                    NEW ALL-TIME RECORD
                  </span>
                ) : (
                  <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase mb-3 leading-normal flex items-center justify-center">
                    SESSION COMPLETED
                  </span>
                )}

                <h2 className="text-3xl font-black text-white font-['Orbitron',sans-serif] tracking-wider mb-3 leading-tight flex items-center justify-center text-center">
                  GAME OVER
                </h2>

                {/* Score Summary Box */}
                <div className="w-full max-w-[320px] bg-[#0c1220] border border-[#1d273f] rounded-2xl p-4 sm:p-6 shadow-xl mb-4">
                  <div className="flex flex-col items-center justify-center text-center">
                    <span className="text-[10px] font-bold text-slate-400 tracking-wider leading-normal">
                      FINAL SCORE
                    </span>
                    <span className="text-3xl font-black text-[#3debe0] tracking-wide mt-2 font-['Orbitron',sans-serif] leading-tight tabular-nums">
                      {score.toLocaleString()}
                    </span>
                  </div>

                  <div className="h-px bg-[#192338] my-3.5" />

                  {/* Stats Grid: Best, Lines Cleared, Max Combo */}
                  <div className="grid grid-cols-3 gap-2 text-center font-['Orbitron',sans-serif]">
                    <div className="flex flex-col items-center justify-center">
                      <span className="text-[9px] font-bold text-slate-400 leading-normal">BEST</span>
                      <span className="text-sm font-black text-[#f6c445] mt-1.5 leading-normal tabular-nums">
                        {bestScore.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex flex-col items-center justify-center border-x border-[#192338]">
                      <span className="text-[9px] font-bold text-slate-400 leading-normal">LINES</span>
                      <span className="text-sm font-black text-white mt-1.5 leading-normal tabular-nums">
                        {totalLinesCleared}
                      </span>
                    </div>
                    <div className="flex flex-col items-center justify-center">
                      <span className="text-[9px] font-bold text-slate-400 leading-normal">COMBO</span>
                      <span className="text-sm font-black text-[#f43f5e] mt-1.5 leading-normal tabular-nums">
                        {maxCombo > 0 ? `${maxCombo}x` : '1x'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons: 12px gap, at least 4px separation */}
                <div className="flex flex-col gap-3 w-full max-w-[320px]">
                  <button
                    type="button"
                    onClick={resetGame}
                    className="btn-creatyxo w-full rounded-2xl bg-[#3debe0] hover:bg-[#34d1c6] text-[#070a11] font-black tracking-widest text-xs sm:text-sm font-['Orbitron',sans-serif] shadow-[0_0_20px_rgba(61,235,224,0.4)] active:scale-95 transition-all cursor-pointer m-1"
                  >
                    PLAY AGAIN
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsGameOver(false);
                      openLeaderboard('game');
                    }}
                    className="btn-creatyxo w-full rounded-xl bg-[#121828] border border-[#1d273f] hover:border-[#3debe0]/40 text-slate-200 hover:text-white font-bold tracking-wider text-xs font-['Orbitron',sans-serif] active:scale-95 transition-all cursor-pointer m-1"
                  >
                    LEADERBOARD
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsGameOver(false);
                      setActiveScreen('home');
                    }}
                    className="btn-creatyxo w-full rounded-xl bg-transparent hover:bg-[#121828] border border-[#1d273f]/60 hover:border-[#1d273f] text-slate-400 hover:text-slate-200 font-bold tracking-wider text-xs font-['Orbitron',sans-serif] active:scale-95 transition-all cursor-pointer m-1"
                  >
                    MAIN MENU
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Floating Dragging Overlay with 1:1 board cell dimension match */}
      {renderFloatingDraggingPiece()}
    </div>
  );
}
