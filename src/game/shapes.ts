/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BlockColor, GridState, PieceShape } from './types';

// Visual themes for the glossy 3D blocks matching the screenshot
export const COLOR_THEMES: Record<
  BlockColor,
  {
    solid: string;
    border: string;
    preview: string;
    shadow: string;
  }
> = {
  orange: {
    solid: 'bg-gradient-to-b from-[#ffb03a] via-[#f97316] to-[#c2410c]',
    border: 'border-[#fdba74]/50',
    preview: 'bg-[#f97316]/75 border-[#ffedd5]/80 shadow-[0_0_12px_rgba(249,115,22,0.8)]',
    shadow: 'shadow-[inset_0_2px_1px_rgba(255,255,255,0.45),inset_0_-2px_2px_rgba(0,0,0,0.45)]',
  },
  cyan: {
    solid: 'bg-gradient-to-b from-[#38e8dd] via-[#0ea5e9] to-[#0369a1]',
    border: 'border-[#7dd3fc]/50',
    preview: 'bg-[#00d2ff]/75 border-[#e0f2fe]/80 shadow-[0_0_12px_rgba(56,232,221,0.8)]',
    shadow: 'shadow-[inset_0_2px_1px_rgba(255,255,255,0.45),inset_0_-2px_2px_rgba(0,0,0,0.45)]',
  },
  rose: {
    solid: 'bg-gradient-to-b from-[#fb7185] via-[#e11d48] to-[#9f1239]',
    border: 'border-[#fda4af]/50',
    preview: 'bg-[#f43f5e]/75 border-[#ffe4e6]/80 shadow-[0_0_12px_rgba(244,63,94,0.8)]',
    shadow: 'shadow-[inset_0_2px_1px_rgba(255,255,255,0.45),inset_0_-2px_2px_rgba(0,0,0,0.45)]',
  },
  green: {
    solid: 'bg-gradient-to-b from-[#4ade80] via-[#16a34a] to-[#14532d]',
    border: 'border-[#86efac]/50',
    preview: 'bg-[#22c55e]/75 border-[#dcfce7]/80 shadow-[0_0_12px_rgba(34,197,94,0.8)]',
    shadow: 'shadow-[inset_0_2px_1px_rgba(255,255,255,0.45),inset_0_-2px_2px_rgba(0,0,0,0.45)]',
  },
  purple: {
    solid: 'bg-gradient-to-b from-[#c084fc] via-[#9333ea] to-[#581c87]',
    border: 'border-[#d8b4fe]/50',
    preview: 'bg-[#a855f7]/75 border-[#f3e8ff]/80 shadow-[0_0_12px_rgba(168,85,247,0.8)]',
    shadow: 'shadow-[inset_0_2px_1px_rgba(255,255,255,0.45),inset_0_-2px_2px_rgba(0,0,0,0.45)]',
  },
  gold: {
    solid: 'bg-gradient-to-b from-[#fde047] via-[#eab308] to-[#854d0e]',
    border: 'border-[#fef08a]/50',
    preview: 'bg-[#eab308]/75 border-[#fef9c3]/80 shadow-[0_0_12px_rgba(234,179,8,0.8)]',
    shadow: 'shadow-[inset_0_2px_1px_rgba(255,255,255,0.45),inset_0_-2px_2px_rgba(0,0,0,0.45)]',
  },
  blue: {
    solid: 'bg-gradient-to-b from-[#60a5fa] via-[#2563eb] to-[#1e3a8a]',
    border: 'border-[#93c5fd]/50',
    preview: 'bg-[#3b82f6]/75 border-[#dbeafe]/80 shadow-[0_0_12px_rgba(59,130,246,0.8)]',
    shadow: 'shadow-[inset_0_2px_1px_rgba(255,255,255,0.45),inset_0_-2px_2px_rgba(0,0,0,0.45)]',
  },
};

// Matrix Transformation Utilities (Rotations & Flips)
export function rotateMatrix90(matrix: number[][]): number[][] {
  const rows = matrix.length;
  const cols = matrix[0].length;
  const result: number[][] = [];
  for (let c = 0; c < cols; c++) {
    const newRow: number[] = [];
    for (let r = rows - 1; r >= 0; r--) {
      newRow.push(matrix[r][c]);
    }
    result.push(newRow);
  }
  return result;
}

export function rotateMatrix(matrix: number[][], rotations: number): number[][] {
  let m = matrix;
  const turns = ((rotations % 4) + 4) % 4;
  for (let i = 0; i < turns; i++) {
    m = rotateMatrix90(m);
  }
  return m;
}

export function flipMatrixHorizontal(matrix: number[][]): number[][] {
  return matrix.map((row) => [...row].reverse());
}

export function getRandomOrientation(matrix: number[][]): number[][] {
  const rotations = Math.floor(Math.random() * 4); // 0, 90, 180, 270 degrees
  let rotated = rotateMatrix(matrix, rotations);
  if (Math.random() < 0.5) {
    rotated = flipMatrixHorizontal(rotated);
  }
  return rotated;
}

// Base Classic Shapes (will be randomly rotated 0, 90, 180, 270 deg)
export const STANDARD_SHAPES: Omit<PieceShape, 'id'>[] = [
  // 1x1 Dot
  {
    name: 'Dot',
    color: 'gold',
    matrix: [[1]],
  },
  // 2-Line
  {
    name: '2-Line',
    color: 'cyan',
    matrix: [[1, 1]],
  },
  // 3-Line
  {
    name: '3-Line',
    color: 'rose',
    matrix: [[1, 1, 1]],
  },
  // 4-Line
  {
    name: '4-Line',
    color: 'blue',
    matrix: [[1, 1, 1, 1]],
  },
  // 5-Line
  {
    name: '5-Line',
    color: 'purple',
    matrix: [[1, 1, 1, 1, 1]],
  },
  // 2x2 Square
  {
    name: 'Square 2x2',
    color: 'orange',
    matrix: [
      [1, 1],
      [1, 1],
    ],
  },
  // 3x3 Square
  {
    name: 'Square 3x3',
    color: 'gold',
    matrix: [
      [1, 1, 1],
      [1, 1, 1],
      [1, 1, 1],
    ],
  },
  // Corner 2x2 (3 blocks)
  {
    name: 'Corner',
    color: 'green',
    matrix: [
      [1, 1],
      [1, 0],
    ],
  },
  // Classic L-Shape (4 blocks)
  {
    name: 'L-Shape',
    color: 'purple',
    matrix: [
      [1, 0],
      [1, 0],
      [1, 1],
    ],
  },
  {
    name: 'L-Shape 2',
    color: 'orange',
    matrix: [
      [1, 1, 1],
      [1, 0, 0],
    ],
  },
  // T-Shape
  {
    name: 'T-Shape',
    color: 'blue',
    matrix: [
      [1, 1, 1],
      [0, 1, 0],
    ],
  },
  // Z & S Shapes
  {
    name: 'Z-Shape',
    color: 'rose',
    matrix: [
      [1, 1, 0],
      [0, 1, 1],
    ],
  },
  {
    name: 'S-Shape',
    color: 'green',
    matrix: [
      [0, 1, 1],
      [1, 1, 0],
    ],
  },
];

// WEIRD & HELPER SHAPES (All randomly oriented in every direction)
export const HELPER_SHAPES: Omit<PieceShape, 'id'>[] = [
  // 1. Diagonal Step Pair - Fits in staggered checkerboard holes
  {
    name: 'Diagonal Step',
    color: 'cyan',
    matrix: [
      [1, 0],
      [0, 1],
    ],
  },
  // 2. Plus / Cross (+)
  {
    name: 'Plus Cross',
    color: 'gold',
    matrix: [
      [0, 1, 0],
      [1, 1, 1],
      [0, 1, 0],
    ],
  },
  // 3. Bridge / Tunnel (3 blocks with empty center)
  {
    name: 'Bridge',
    color: 'rose',
    matrix: [[1, 0, 1]],
  },
  // 4. Horseshoe / U-Shape / Arch (wraps around an obstacle)
  {
    name: 'Horseshoe',
    color: 'green',
    matrix: [
      [1, 0, 1],
      [1, 1, 1],
    ],
  },
  // 5. C-Cup
  {
    name: 'C-Cup',
    color: 'purple',
    matrix: [
      [1, 1],
      [1, 0],
      [1, 1],
    ],
  },
  // 6. Long-Stem Key Pin
  {
    name: 'Key Pin',
    color: 'blue',
    matrix: [
      [1, 1, 1],
      [0, 1, 0],
      [0, 1, 0],
    ],
  },
  // 7. Big 3x3 Corner (5 blocks)
  {
    name: 'Big L Corner',
    color: 'cyan',
    matrix: [
      [1, 0, 0],
      [1, 0, 0],
      [1, 1, 1],
    ],
  },
  // 8. Mini Spoon / Dipper
  {
    name: 'Mini Dipper',
    color: 'purple',
    matrix: [
      [1, 0, 0],
      [1, 1, 1],
    ],
  },
  // 9. Long Hook (4 blocks)
  {
    name: 'Long Hook',
    color: 'rose',
    matrix: [
      [1, 1],
      [0, 1],
      [0, 1],
    ],
  },
  // 10. Diagonal Trio (3-block diagonal stair)
  {
    name: 'Diagonal Trio',
    color: 'gold',
    matrix: [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ],
  },
];

// Savior pieces when the board is cramped
export const SAVIOR_SHAPES: Omit<PieceShape, 'id'>[] = [
  { name: 'Dot Gold', color: 'gold', matrix: [[1]] },
  { name: 'Dot Cyan', color: 'cyan', matrix: [[1]] },
  { name: '2-Line', color: 'cyan', matrix: [[1, 1]] },
  { name: 'Corner', color: 'green', matrix: [[1, 1], [1, 0]] },
  { name: 'Bridge', color: 'rose', matrix: [[1, 0, 1]] },
  { name: 'Diagonal Step', color: 'cyan', matrix: [[1, 0], [0, 1]] },
  { name: '3-Line', color: 'rose', matrix: [[1, 1, 1]] },
  { name: 'Square 2x2', color: 'orange', matrix: [[1, 1], [1, 1]] },
];

export function createEmptyGrid(): GridState {
  return Array.from({ length: 8 }, () => Array.from({ length: 8 }, () => null));
}

let pieceCounter = 0;

export function getRandomPiece(
  grid?: GridState,
  forceHelper = false,
  mustFit = false
): PieceShape {
  const useHelper = forceHelper || Math.random() < 0.35;
  const pool = useHelper ? HELPER_SHAPES : STANDARD_SHAPES;
  let candidate: { name: string; color: BlockColor; matrix: number[][] } | null = null;

  if (mustFit && grid) {
    // Try multiple random templates and random rotations until finding one that fits!
    for (let attempt = 0; attempt < 35; attempt++) {
      const template = pool[Math.floor(Math.random() * pool.length)];
      // Apply completely random orientation (0, 90, 180, 270 deg, optional flip)
      const orientedMatrix = getRandomOrientation(template.matrix);
      const testPiece: PieceShape = {
        name: template.name,
        color: template.color,
        matrix: orientedMatrix,
        id: 'test',
      };

      if (canPieceFitAnywhere(grid, testPiece)) {
        candidate = {
          name: template.name,
          color: template.color,
          matrix: orientedMatrix,
        };
        break;
      }
    }

    // If still not found, check savior shapes with random orientations
    if (!candidate) {
      for (const savior of SAVIOR_SHAPES) {
        for (let rot = 0; rot < 4; rot++) {
          const oriented = rotateMatrix(savior.matrix, rot);
          const testPiece: PieceShape = {
            name: savior.name,
            color: savior.color,
            matrix: oriented,
            id: 'test',
          };
          if (canPieceFitAnywhere(grid, testPiece)) {
            candidate = {
              name: savior.name,
              color: savior.color,
              matrix: oriented,
            };
            break;
          }
        }
        if (candidate) break;
      }
    }
  }

  // Fallback to organic random selection with random orientation
  if (!candidate) {
    const template = pool[Math.floor(Math.random() * pool.length)];
    candidate = {
      name: template.name,
      color: template.color,
      matrix: getRandomOrientation(template.matrix),
    };
  }

  pieceCounter++;
  return {
    ...candidate,
    id: `piece-${Date.now()}-${pieceCounter}-${Math.random().toString(36).slice(2, 6)}`,
  };
}

export function canPlacePiece(
  grid: GridState,
  piece: PieceShape,
  targetR: number,
  targetC: number
): boolean {
  const rows = piece.matrix.length;
  const cols = piece.matrix[0].length;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (piece.matrix[r][c] === 1) {
        const boardR = targetR + r;
        const boardC = targetC + c;

        // Check bounds
        if (boardR < 0 || boardR >= 8 || boardC < 0 || boardC >= 8) {
          return false;
        }

        // Check collision with existing locked block
        if (grid[boardR][boardC] !== null) {
          return false;
        }
      }
    }
  }

  return true;
}

export function canPieceFitAnywhere(grid: GridState, piece: PieceShape): boolean {
  const rows = piece.matrix.length;
  const cols = piece.matrix[0].length;

  for (let r = 0; r <= 8 - rows; r++) {
    for (let c = 0; c <= 8 - cols; c++) {
      if (canPlacePiece(grid, piece, r, c)) {
        return true;
      }
    }
  }

  return false;
}

export function findFirstValidPlacement(
  grid: GridState,
  piece: PieceShape
): { r: number; c: number } | null {
  const rows = piece.matrix.length;
  const cols = piece.matrix[0].length;

  for (let r = 0; r <= 8 - rows; r++) {
    for (let c = 0; c <= 8 - cols; c++) {
      if (canPlacePiece(grid, piece, r, c)) {
        return { r, c };
      }
    }
  }

  return null;
}

export function placePieceOnGrid(
  grid: GridState,
  piece: PieceShape,
  targetR: number,
  targetC: number
): GridState {
  const newGrid = grid.map((row) => [...row]);
  for (let r = 0; r < piece.matrix.length; r++) {
    for (let c = 0; c < piece.matrix[0].length; c++) {
      if (piece.matrix[r][c] === 1) {
        newGrid[targetR + r][targetC + c] = piece.color;
      }
    }
  }
  return newGrid;
}

/**
 * Spawns 3 randomized pieces.
 * CRITICAL GUARANTEE: Every block in the tray has a guaranteed place to be
 * WITHOUT having to clear a row!
 * All 3 pieces can be placed simultaneously onto disjoint cells of the current board.
 */
export function getRandomPieces(count = 3, grid?: GridState): PieceShape[] {
  if (!grid) {
    return Array.from({ length: count }, (_, idx) => getRandomPiece(undefined, idx === 1));
  }

  // Attempt to find a batch of 3 pieces that can ALL fit simultaneously on the board without clearing a line
  for (let attempt = 0; attempt < 50; attempt++) {
    const pieces: PieceShape[] = [];
    let simGrid = grid.map((row) => [...row]);
    let success = true;

    for (let i = 0; i < count; i++) {
      const isHelperSlot = i === 1;
      const piece = getRandomPiece(simGrid, isHelperSlot, true);
      const placement = findFirstValidPlacement(simGrid, piece);

      if (!placement) {
        success = false;
        break;
      }

      // Mark the cells as occupied on the simulated board (WITHOUT clearing rows)
      simGrid = placePieceOnGrid(simGrid, piece, placement.r, placement.c);
      pieces.push(piece);
    }

    if (success && pieces.length === count) {
      return pieces;
    }
  }

  // If the board is very crowded, guarantee placement by picking compact/savior pieces that all fit
  const guaranteedPieces: PieceShape[] = [];
  let simGrid = grid.map((row) => [...row]);

  for (let i = 0; i < count; i++) {
    let placedPiece: PieceShape | null = null;

    for (const savior of SAVIOR_SHAPES) {
      for (let rot = 0; rot < 4; rot++) {
        const oriented = rotateMatrix(savior.matrix, rot);
        const testPiece: PieceShape = {
          name: savior.name,
          color: savior.color,
          matrix: oriented,
          id: `savior-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
        };
        const placement = findFirstValidPlacement(simGrid, testPiece);
        if (placement) {
          simGrid = placePieceOnGrid(simGrid, testPiece, placement.r, placement.c);
          placedPiece = testPiece;
          break;
        }
      }
      if (placedPiece) break;
    }

    if (placedPiece) {
      guaranteedPieces.push(placedPiece);
    } else {
      guaranteedPieces.push(getRandomPiece(grid, false, false));
    }
  }

  return guaranteedPieces;
}
