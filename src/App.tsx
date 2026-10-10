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
} from './game/audio';
import { HomeScreen } from './components/HomeScreen';
import { LeaderboardScreen } from './components/LeaderboardScreen';
import { NameSetupModal } from './components/NameSetupModal';
import { AudioSettingsModal } from './components/AudioSettingsModal';
import { TutorialGuideOverlay } from './components/TutorialGuideOverlay';
import {
  PlayerProfile,
  generateRandomName,
  buildLeaderboard,
  fetchSharedLeaderboard,
  savePlayerToLeaderboard,
} from './game/leaderboard';

// Tutorial Interactive Testing Configurations
const TUTORIAL_STEP1_PIECES: PieceShape[] = [
  { id: 'tut-cube', name: '2x2 Square', matrix: [[1, 1], [1, 1]], color: 'cyan' },
  { id: 'tut-h3', name: '3x1 Line', matrix: [[1, 1, 1]], color: 'orange' },
  { id: 'tut-v3', name: '1x3 Column', matrix: [[1], [1], [1]], color: 'purple' },
];

const TUTORIAL_STEP2_PIECES: PieceShape[] = [
  { id: 'tut-h2', name: '2x1 Line', matrix: [[1, 1]], color: 'cyan' },
  { id: 'tut-dot', name: 'Single Block', matrix: [[1]], color: 'gold' },
  { id: 'tut-corner', name: 'Corner', matrix: [[1, 1], [0, 1]], color: 'rose' },
];

function createTutorialStep2Grid(): GridState {
  const g = createEmptyGrid();
  // Fill row 6 across except columns 3 and 4 for an authentic line-clearing feeling
  const colors: BlockColor[] = ['orange', 'rose', 'purple', 'cyan', 'cyan', 'green', 'gold', 'blue'];
  for (let c = 0; c < 8; c++) {
    if (c !== 3 && c !== 4) {
      g[6][c] = colors[c];
    }
  }
  return g;
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

  // Interactive In-Game Tutorial State (test dragging and row clears)
  const [isTutorialActive, setIsTutorialActive] = useState<boolean>(false);
  const [tutorialStep, setTutorialStep] = useState<1 | 2 | 3>(1);
  const [hasSeenTutorial, setHasSeenTutorial] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('creatyxo_tutorial_seen') === 'true';
    }
    return false;
  });

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

  // Synchronize initial audio volume levels
  useEffect(() => {
    setSoundVolume(soundVolume);
    setMusicVolume(musicVolume);
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

  const isTutorialActiveRef = useRef<boolean>(false);
  isTutorialActiveRef.current = isTutorialActive;
  const tutorialStepRef = useRef<1 | 2 | 3>(1);
  tutorialStepRef.current = tutorialStep;

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

  // Sync best score to localStorage and save to real leaderboard
  useEffect(() => {
    if (score > bestScore) {
      setBestScore(score);
      setIsNewRecord(true);
      try {
        localStorage.setItem('creatyxo_best_score', score.toString());
        if (playerProfile.hasChosenName) {
          savePlayerToLeaderboard(playerProfile, score);
        }
      } catch {
        // Ignore
      }
    }
  }, [score, bestScore, playerProfile]);

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

  // Start interactive testing tutorial
  const startInteractiveTutorial = useCallback(() => {
    if (musicEnabled) {
      startBackgroundMusic(true);
    }
    setIsTutorialActive(true);
    setTutorialStep(1);
    setGrid(createEmptyGrid());
    setTray(TUTORIAL_STEP1_PIECES);
    setScore(0);
    setCombo(0);
    setIsGameOver(false);
    setIsPaused(false);
    setActiveScreen('game');
  }, [musicEnabled]);

  // Start game flow with first-time interactive testing tutorial trigger
  const handleStartGame = () => {
    if (musicEnabled) {
      startBackgroundMusic(true);
    }
    if (!hasSeenTutorial) {
      startInteractiveTutorial();
    } else {
      setActiveScreen('game');
    }
  };

  const handleFinishTutorial = () => {
    setIsTutorialActive(false);
    setHasSeenTutorial(true);
    try {
      localStorage.setItem('creatyxo_tutorial_seen', 'true');
    } catch {
      // ignore
    }
    resetGame();
  };

  const handleSkipTutorial = () => {
    setIsTutorialActive(false);
    setHasSeenTutorial(true);
    try {
      localStorage.setItem('creatyxo_tutorial_seen', 'true');
    } catch {
      // ignore
    }
    resetGame();
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
        gapPx: Math.max(2, Math.round(gapPx)),
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

          playClearSound(nextCombo, soundEnabled);

          let lineMultiplier = 150;
          if (linesCleared === 2) lineMultiplier = 400;
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

        // Tutorial Interactive Progression Handling
        if (isTutorialActiveRef.current) {
          setGrid(newGrid);
          setTray([null, null, null]);

          if (tutorialStepRef.current === 1) {
            // Player tested placing a block -> advance to row-clearing test
            setTimeout(() => {
              setTutorialStep(2);
              setGrid(createTutorialStep2Grid());
              setTray(TUTORIAL_STEP2_PIECES);
            }, 550);
          } else if (tutorialStepRef.current === 2) {
            // Player tested line clear -> advance to tutorial completion
            setTimeout(() => {
              setTutorialStep(3);
            }, 700);
          }

          setDragging(null);
          setPreviewPlacement(null);
          return;
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
        className="grid gap-0.5 pointer-events-none select-none transition-transform"
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

  // Render dragging piece matching the board square size 1:1
  const renderFloatingDraggingPiece = () => {
    if (!dragging) return null;
    const { piece, pointerX, pointerY, isTouch } = dragging;
    const theme = COLOR_THEMES[piece.color];
    const rows = piece.matrix.length;
    const cols = piece.matrix[0].length;

    const { cellPx, gapPx } = getBoardCellMetrics();
    const touchOffset = isTouch ? 75 : 0;

    return (
      <div
        className="fixed pointer-events-none z-50 select-none -translate-x-1/2 -translate-y-1/2"
        style={{
          left: `${pointerX}px`,
          top: `${pointerY - touchOffset}px`,
        }}
      >
        <div
          className="grid filter drop-shadow-[0_8px_16px_rgba(0,0,0,0.85)] scale-100"
          style={{
            gridTemplateRows: `repeat(${rows}, ${cellPx}px)`,
            gridTemplateColumns: `repeat(${cols}, ${cellPx}px)`,
            gap: `${gapPx}px`,
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
    <div className="w-full h-full h-[100dvh] max-h-[100dvh] bg-[#070a11] text-slate-100 flex flex-col items-center justify-center select-none font-['Orbitron',sans-serif] overflow-hidden p-0 sm:p-3 touch-none">
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

      {/* Main Container */}
      <main
        className={`w-full max-w-[420px] h-full max-h-full sm:max-h-[820px] flex flex-col mx-auto relative bg-[#070a11] overflow-hidden ${
          activeScreen === 'ranking'
            ? 'px-4 sm:px-5 py-2.5'
            : 'px-6 sm:px-8 pt-3 pb-6 justify-between'
        }`}
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
            onOpenTutorial={startInteractiveTutorial}
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
            {/* Interactive Tutorial Guide Overlay with Traveling Ghost Blocks */}
            {isTutorialActive && (
              <TutorialGuideOverlay
                step={tutorialStep}
                targetR={tutorialStep === 1 ? 3 : 6}
                targetC={tutorialStep === 1 ? 3 : 3}
                piece={
                  tutorialStep === 1
                    ? TUTORIAL_STEP1_PIECES[0]
                    : tutorialStep === 2
                    ? TUTORIAL_STEP2_PIECES[0]
                    : null
                }
                traySlotIndex={0}
                boardElement={boardRef.current}
                isDragging={dragging !== null}
                onSkip={handleSkipTutorial}
                onStartPlaying={handleFinishTutorial}
              />
            )}
            {/* Top Header Section */}
            <header className="flex flex-col gap-3 w-full shrink-0">
              {/* Top Bar: Home, Title, Music & Sound Controls */}
              <div className="flex items-center justify-between">
                {/* Home Return Button */}
                <button
                  type="button"
                  aria-label="Return to Home"
                  onClick={() => setActiveScreen('home')}
                  style={{ marginRight: 0, marginLeft: 39, marginTop: 10 }}
                  className="w-10 h-10 rounded-xl bg-[#121828] border border-[#1b263d] flex items-center justify-center text-slate-300 hover:text-[#3debe0] hover:border-[#3debe0]/40 active:scale-95 transition-all cursor-pointer shadow-sm shrink-0"
                  title="Main Menu"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
                  </svg>
                </button>

                <h1
                  style={{ marginTop: 10 }}
                  className="text-[26px] sm:text-[32px] tracking-wide text-[#3debe0] uppercase font-['Black_Ops_One',sans-serif] drop-shadow-[0_0_16px_rgba(61,235,224,0.35)] text-center px-1 leading-none select-none cursor-pointer"
                  onClick={() => setActiveScreen('home')}
                  title="Main Menu"
                >
                  CREATYXO
                </h1>

                {/* Music & Sound Controls */}
                <div
                  style={{
                    paddingTop: 0,
                    paddingLeft: 0,
                    marginLeft: 0,
                    marginTop: 10,
                    marginBottom: 0,
                    marginRight: 39,
                  }}
                  className="flex items-center gap-1.5 shrink-0"
                >
                  {/* Audio Controls: Sliders Modal Button, Music & SFX */}
                  <button
                    type="button"
                    aria-label="Adjust sound and music volume"
                    onClick={() => setIsAudioSettingsOpen(true)}
                    className="w-9 h-9 rounded-xl border border-[#1b263d] bg-[#121828] text-slate-400 hover:text-[#3debe0] hover:border-[#3debe0]/50 flex items-center justify-center cursor-pointer active:scale-95 transition-all shadow-sm"
                    title="Audio Volume Settings"
                  >
                    <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                      <path d="M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z" />
                    </svg>
                  </button>

                  {/* Music Toggle */}
                  <button
                    type="button"
                    aria-label={musicEnabled ? 'Turn music off' : 'Turn music on'}
                    onClick={toggleMusic}
                    className={`w-9 h-9 rounded-xl border flex items-center justify-center cursor-pointer active:scale-95 transition-all shadow-sm ${
                      musicEnabled
                        ? 'bg-[#121828] border-[#3debe0]/50 text-[#3debe0]'
                        : 'bg-[#121828] border-[#1b263d] text-slate-500'
                    }`}
                    title={musicEnabled ? 'Chill Music: ON' : 'Chill Music: OFF'}
                  >
                    <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                      <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                    </svg>
                  </button>

                  {/* SFX Toggle */}
                  <button
                    type="button"
                    aria-label={soundEnabled ? 'Mute sound' : 'Unmute sound'}
                    onClick={toggleSound}
                    className={`w-9 h-9 rounded-xl border flex items-center justify-center cursor-pointer active:scale-95 transition-all shadow-sm ${
                      soundEnabled
                        ? 'bg-[#121828] border-[#3debe0]/50 text-[#3debe0]'
                        : 'bg-[#121828] border-[#1b263d] text-slate-500'
                    }`}
                    title={soundEnabled ? 'SFX: ON' : 'SFX: OFF'}
                  >
                    {soundEnabled ? (
                      <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                        <path d="M14 3.23v17.54a1 1 0 0 1-1.6.8L6.7 16H3a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1h3.7l5.7-5.57a1 1 0 0 1 1.6.8zm4.5 5.27a1 1 0 0 1 1.41.09A7.95 7.95 0 0 1 22 12c0 2.22-.9 4.23-2.35 5.68a1 1 0 1 1-1.42-1.41A5.96 5.96 0 0 0 20 12c0-1.66-.67-3.17-1.76-4.27a1 1 0 0 1 .26-1.23z" />
                      </svg>
                    ) : (
                      <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                        <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27l4.73 4.73H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Score Cards Row */}
              <div className="grid grid-cols-2 gap-3 w-full">
                {/* Score Card */}
                <div
                  style={{
                    paddingTop: 0,
                    paddingLeft: 12,
                    paddingRight: 12,
                    marginLeft: 37,
                    marginRight: -2,
                    marginBottom: 0,
                    marginTop: 0,
                  }}
                  className="bg-[#101625] border border-[#1b263d] rounded-2xl py-2.5 sm:py-3 flex flex-col justify-between shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 tracking-wider font-['Orbitron',sans-serif]">
                      SCORE
                    </span>
                    {combo > 1 ? (
                      <span className="text-[9px] font-bold text-[#f43f5e] bg-[#2d1523] border border-[#4d1f35] px-2 py-0.5 rounded-full font-['Orbitron',sans-serif]">
                        COMBO {combo}x
                      </span>
                    ) : (
                      <span className="text-[9px] font-bold text-slate-500 bg-[#141b2e] px-2 py-0.5 rounded-full font-['Orbitron',sans-serif]">
                        1x
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
                  className="bg-[#101625] border border-[#1b263d] rounded-2xl px-3.5 py-2.5 sm:px-4 sm:py-3 flex flex-col justify-between shadow-sm"
                >
                  <div
                    style={{
                      marginLeft: 0,
                      paddingLeft: 0,
                      paddingTop: 0,
                      marginRight: 0,
                    }}
                    className="flex items-center justify-between"
                  >
                    <span
                      style={{ marginLeft: 6 }}
                      className="text-[10px] font-bold text-slate-400 tracking-wider font-['Orbitron',sans-serif]"
                    >
                      BEST
                    </span>
                    <span className="text-[9px] text-slate-500 font-bold font-['Orbitron',sans-serif]">
                      #{userRank}
                    </span>
                  </div>
                  <div
                    style={{ marginLeft: 6 }}
                    className="mt-1 text-xl sm:text-2xl font-black text-[#f6c445] tracking-wide font-['Orbitron',sans-serif]"
                  >
                    {bestScore.toLocaleString()}
                  </div>
                </div>
              </div>
            </header>

            {/* Centered Board Area */}
            <section
              aria-label="Game Board"
              className="w-full flex-1 flex items-center justify-center my-1 sm:my-2 min-h-0"
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
                className="relative select-none touch-none"
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
                      data-tray-slot={slotIdx}
                      style={{
                        height: 80,
                        borderRadius: 16,
                        backgroundColor: '#101625',
                        border: '1px solid #192237',
                      }}
                      className="flex items-center justify-center relative touch-none select-none transition-transform active:scale-95 cursor-grab"
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

            {/* Bottom Navigation */}
            <nav
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
              aria-label="Navigation"
            >
              {/* Play Tab (Active) */}
              <button
                type="button"
                onClick={() => setActiveScreen('game')}
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
                onClick={() => openLeaderboard('game')}
                className="flex flex-col items-center gap-1 text-slate-400 hover:text-[#3debe0] cursor-pointer active:scale-95 transition-all"
                title="View Leaderboard"
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

              {/* Settings / Pause Tab */}
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

            {/* Pause / Settings Modal Overlay */}
            {isPaused && (
              <div className="absolute inset-0 bg-[#070a11]/90 backdrop-blur-sm z-40 flex flex-col items-center justify-center p-5 text-center animate-fadeIn select-none">
                <div className="w-full max-w-[270px] bg-[#0c1220] border border-[#1b263d] rounded-2xl p-4 shadow-2xl flex flex-col gap-3">
                  <div className="flex items-center justify-between border-b border-[#172238] pb-2">
                    <h2 className="text-sm font-black text-white font-['Orbitron',sans-serif] tracking-wider">
                      GAME PAUSED
                    </h2>
                    <span className="text-[10px] text-[#3debe0] font-['Orbitron',sans-serif] font-bold">
                      SETTINGS
                    </span>
                  </div>

                  {/* Audio Volume Controls (Directly accessible in Pause) */}
                  <div className="bg-[#101726] border border-[#19243a] rounded-xl p-2.5 flex flex-col gap-2.5 text-left">
                    {/* Music Loudness */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-bold text-slate-300 font-['Orbitron',sans-serif] flex items-center gap-1.5">
                          <svg className="w-3 h-3 text-[#3debe0] fill-current" viewBox="0 0 24 24">
                            <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                          </svg>
                          MUSIC
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-black text-[#3debe0] font-['Orbitron',sans-serif]">
                            {Math.round(musicVolume * 100)}%
                          </span>
                          <button
                            type="button"
                            onClick={toggleMusic}
                            className={`text-[8px] font-bold px-1.5 py-0.5 rounded border font-['Orbitron',sans-serif] cursor-pointer transition-colors ${
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
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-bold text-slate-300 font-['Orbitron',sans-serif] flex items-center gap-1.5">
                          <svg className="w-3 h-3 text-[#3debe0] fill-current" viewBox="0 0 24 24">
                            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
                          </svg>
                          SOUND FX
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-black text-[#3debe0] font-['Orbitron',sans-serif]">
                            {Math.round(soundVolume * 100)}%
                          </span>
                          <button
                            type="button"
                            onClick={toggleSound}
                            className={`text-[8px] font-bold px-1.5 py-0.5 rounded border font-['Orbitron',sans-serif] cursor-pointer transition-colors ${
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

                  {/* Navigation Actions */}
                  <div className="flex flex-col gap-1.5">
                    <button
                      type="button"
                      onClick={() => setIsPaused(false)}
                      className="w-full py-2.5 rounded-xl bg-[#3debe0] text-[#070a11] font-black tracking-wider hover:bg-[#34d1c6] active:scale-95 transition-all shadow-md cursor-pointer text-xs font-['Orbitron',sans-serif]"
                    >
                      RESUME
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsPaused(false);
                        startInteractiveTutorial();
                      }}
                      className="w-full py-2 rounded-xl bg-[#141b2e] border border-[#222f4b] text-slate-200 hover:text-white font-bold tracking-wider hover:bg-[#1a253f] active:scale-95 transition-all cursor-pointer text-xs font-['Orbitron',sans-serif]"
                    >
                      HOW TO PLAY (TEST)
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsPaused(false);
                        openLeaderboard('game');
                      }}
                      className="w-full py-2 rounded-xl bg-[#141b2e] border border-[#222f4b] text-slate-200 hover:text-white font-bold tracking-wider hover:bg-[#1a253f] active:scale-95 transition-all cursor-pointer text-xs font-['Orbitron',sans-serif]"
                    >
                      LEADERBOARD
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsPaused(false);
                        setActiveScreen('home');
                      }}
                      className="w-full py-2 rounded-xl bg-[#141b2e] border border-[#222f4b] text-slate-200 hover:text-white font-bold tracking-wider hover:bg-[#1a253f] active:scale-95 transition-all cursor-pointer text-xs font-['Orbitron',sans-serif]"
                    >
                      HOME SCREEN
                    </button>

                    <button
                      type="button"
                      onClick={resetGame}
                      className="w-full py-2 rounded-xl bg-[#141b2e] border border-[#222f4b] text-slate-400 hover:text-white font-bold tracking-wider hover:bg-[#1a253f] active:scale-95 transition-all cursor-pointer text-xs font-['Orbitron',sans-serif]"
                    >
                      RESTART
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Ending Screen (Clean & Calm) */}
            {isGameOver && (
              <div className="absolute inset-0 bg-[#070a11]/95 backdrop-blur-md z-40 flex flex-col items-center justify-center p-6 text-center animate-fadeIn">
                {isNewRecord && score > 0 ? (
                  <span className="px-3 py-1 rounded-full bg-[#f6c445]/20 text-[#f6c445] border border-[#f6c445]/40 text-[10px] font-bold tracking-widest uppercase mb-3">
                    NEW ALL-TIME RECORD
                  </span>
                ) : (
                  <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase mb-3">
                    SESSION COMPLETED
                  </span>
                )}

                <h2 className="text-3xl font-black text-white font-['Orbitron',sans-serif] tracking-wider mb-3">
                  GAME OVER
                </h2>

                {/* Score Summary Box */}
                <div className="w-full max-w-[280px] bg-[#0c1220] border border-[#1d273f] rounded-2xl p-4 shadow-xl mb-5">
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] font-bold text-slate-400 tracking-wider">
                      FINAL SCORE
                    </span>
                    <span className="text-3xl font-black text-[#3debe0] tracking-wide mt-1 font-['Orbitron',sans-serif]">
                      {score.toLocaleString()}
                    </span>
                  </div>

                  <div className="h-px bg-[#192338] my-3" />

                  {/* Stats Grid: Best, Lines Cleared, Max Combo */}
                  <div className="grid grid-cols-3 gap-2 text-center font-['Orbitron',sans-serif]">
                    <div className="flex flex-col">
                      <span className="text-[9px] font-bold text-slate-400">BEST</span>
                      <span className="text-sm font-black text-[#f6c445] mt-0.5">
                        {bestScore.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex flex-col border-x border-[#192338]">
                      <span className="text-[9px] font-bold text-slate-400">LINES</span>
                      <span className="text-sm font-black text-white mt-0.5">
                        {totalLinesCleared}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[9px] font-bold text-slate-400">COMBO</span>
                      <span className="text-sm font-black text-[#f43f5e] mt-0.5">
                        {maxCombo > 0 ? `${maxCombo}x` : '1x'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons: Play Again, View Rankings, Main Menu */}
                <div className="flex flex-col gap-2.5 w-full max-w-[280px]">
                  <button
                    type="button"
                    onClick={resetGame}
                    className="w-full py-3.5 rounded-xl bg-[#3debe0] hover:bg-[#34d1c6] text-[#070a11] font-black tracking-wider text-xs font-['Orbitron',sans-serif] active:scale-95 transition-all shadow-md cursor-pointer"
                  >
                    PLAY AGAIN
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsGameOver(false);
                      openLeaderboard('game');
                    }}
                    className="w-full py-2.5 rounded-xl bg-[#121828] border border-[#1d273f] text-slate-200 hover:text-white font-bold tracking-wider text-xs font-['Orbitron',sans-serif] active:scale-95 transition-all cursor-pointer"
                  >
                    LEADERBOARD
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsGameOver(false);
                      setActiveScreen('home');
                    }}
                    className="w-full py-2 rounded-xl bg-transparent text-slate-500 hover:text-slate-300 font-bold tracking-wider text-xs font-['Orbitron',sans-serif] active:scale-95 transition-all cursor-pointer"
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
