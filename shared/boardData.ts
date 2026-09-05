import { BoardPoint, PieceColor, PointType } from './types.js';

export const BOARD_ROWS = 12;
export const BOARD_COLS = 5;
export const TOTAL_POINTS = 60;

// Camps (5 for Black, 5 for White)
export const BLACK_CAMPS = new Set([11, 13, 17, 21, 23]); // (2,1), (2,3), (3,2), (4,1), (4,3)
export const WHITE_CAMPS = new Set([36, 38, 42, 46, 48]); // (7,1), (7,3), (8,2), (9,1), (9,3)
export const ALL_CAMPS = new Set([...BLACK_CAMPS, ...WHITE_CAMPS]);

// Headquarters (2 for Black, 2 for White)
export const BLACK_HEADQUARTERS = new Set([1, 3]);   // (0,1), (0,3)
export const WHITE_HEADQUARTERS = new Set([56, 58]); // (11,1), (11,3)
export const ALL_HEADQUARTERS = new Set([...BLACK_HEADQUARTERS, ...WHITE_HEADQUARTERS]);

// Railroad nodes
export const RAILROAD_POINTS = new Set([
  // Black side
  5, 6, 7, 8, 9,       // row 1
  10, 14,              // row 2 outer
  15, 19,              // row 3 outer
  20, 24,              // row 4 outer
  25, 26, 27, 28, 29,  // row 5 (front line)
  // White side
  30, 31, 32, 33, 34,  // row 6 (front line)
  35, 39,              // row 7 outer
  40, 44,              // row 8 outer
  45, 49,              // row 9 outer
  50, 51, 52, 53, 54   // row 10
]);

// Build Board Points
export const BOARD_POINTS: BoardPoint[] = Array.from({ length: TOTAL_POINTS }, (_, index) => {
  const row = Math.floor(index / BOARD_COLS);
  const col = index % BOARD_COLS;
  const owner: PieceColor = row < 6 ? 'black' : 'white';
  
  let type: PointType = 'station';
  if (ALL_CAMPS.has(index)) {
    type = 'camp';
  } else if (ALL_HEADQUARTERS.has(index)) {
    type = 'headquarter';
  }

  const isRailroad = RAILROAD_POINTS.has(index);

  return {
    index,
    row,
    col,
    type,
    owner,
    isRailroad,
  };
});

// Helper: Convert row, col to index
export function rcToIndex(row: number, col: number): number {
  if (row < 0 || row >= BOARD_ROWS || col < 0 || col >= BOARD_COLS) return -1;
  return row * BOARD_COLS + col;
}

// Build Adjacency Graphs: Highway Graph and Railroad Graph
export const HIGHWAY_ADJACENCY: number[][] = Array.from({ length: TOTAL_POINTS }, () => []);
export const RAILROAD_ADJACENCY: number[][] = Array.from({ length: TOTAL_POINTS }, () => []);
export const ALL_HIGHWAY_EDGES: [number, number][] = [];
export const ALL_RAILROAD_EDGES: [number, number][] = [];

// Straight Railroad lines (for non-engineers to move any distance in straight line)
// Each line is an array of point indices along a single track.
export const RAILROAD_STRAIGHT_LINES: number[][] = [
  // Black horizontal lines
  [5, 6, 7, 8, 9],
  [25, 26, 27, 28, 29],
  // Black vertical lines
  [5, 10, 15, 20, 25],
  [9, 14, 19, 24, 29],

  // White horizontal lines
  [30, 31, 32, 33, 34],
  [50, 51, 52, 53, 54],
  // White vertical lines
  [30, 35, 40, 45, 50],
  [34, 39, 44, 49, 54],

  // River bridges crossing front lines (connecting Black and White):
  // Col 0 vertical track: 5 -> 10 -> 15 -> 20 -> 25 -> 30 -> 35 -> 40 -> 45 -> 50
  [5, 10, 15, 20, 25, 30, 35, 40, 45, 50],
  // Col 4 vertical track: 9 -> 14 -> 19 -> 24 -> 29 -> 34 -> 39 -> 44 -> 49 -> 54
  [9, 14, 19, 24, 29, 34, 39, 44, 49, 54],
  // Col 2 center bridge track: 27 <-> 32
  [27, 32],
];

// Populate adjacency
(function initAdjacency() {
  const addHighwayEdge = (u: number, v: number) => {
    if (u >= 0 && u < TOTAL_POINTS && v >= 0 && v < TOTAL_POINTS) {
      if (!HIGHWAY_ADJACENCY[u].includes(v)) HIGHWAY_ADJACENCY[u].push(v);
      if (!HIGHWAY_ADJACENCY[v].includes(u)) HIGHWAY_ADJACENCY[v].push(u);
      const min = Math.min(u, v);
      const max = Math.max(u, v);
      if (!ALL_HIGHWAY_EDGES.some(([a, b]) => a === min && b === max)) {
        ALL_HIGHWAY_EDGES.push([min, max]);
      }
    }
  };

  const addRailroadEdge = (u: number, v: number) => {
    if (u >= 0 && u < TOTAL_POINTS && v >= 0 && v < TOTAL_POINTS) {
      if (!RAILROAD_ADJACENCY[u].includes(v)) RAILROAD_ADJACENCY[u].push(v);
      if (!RAILROAD_ADJACENCY[v].includes(u)) RAILROAD_ADJACENCY[v].push(u);
      const min = Math.min(u, v);
      const max = Math.max(u, v);
      if (!ALL_RAILROAD_EDGES.some(([a, b]) => a === min && b === max)) {
        ALL_RAILROAD_EDGES.push([min, max]);
      }
    }
  };

  // 1. Grid orthogonal lines within each half (rows 0..5 and rows 6..11)
  for (let r = 0; r < BOARD_ROWS; r++) {
    for (let c = 0; c < BOARD_COLS; c++) {
      const u = rcToIndex(r, c);
      // Horizontal neighbor
      if (c + 1 < BOARD_COLS) {
        addHighwayEdge(u, rcToIndex(r, c + 1));
      }
      // Vertical neighbor within same half
      if (r < 5 || (r >= 6 && r < 11)) {
        addHighwayEdge(u, rcToIndex(r + 1, c));
      }
    }
  }

  // 2. River crossings between row 5 and row 6
  // Col 0, 2, 4 have bridges. Col 1 and 3 are mountains (no edge).
  addHighwayEdge(rcToIndex(5, 0), rcToIndex(6, 0));
  addHighwayEdge(rcToIndex(5, 2), rcToIndex(6, 2));
  addHighwayEdge(rcToIndex(5, 4), rcToIndex(6, 4));

  // 3. Camp diagonal connections
  // Every camp has 4 diagonal connections to its 4 diagonal corner stations
  const campLocations = [
    { r: 2, c: 1 }, { r: 2, c: 3 }, { r: 3, c: 2 }, { r: 4, c: 1 }, { r: 4, c: 3 },
    { r: 7, c: 1 }, { r: 7, c: 3 }, { r: 8, c: 2 }, { r: 9, c: 1 }, { r: 9, c: 3 },
  ];

  for (const { r, c } of campLocations) {
    const campIdx = rcToIndex(r, c);
    const diagonals = [
      rcToIndex(r - 1, c - 1),
      rcToIndex(r - 1, c + 1),
      rcToIndex(r + 1, c - 1),
      rcToIndex(r + 1, c + 1),
    ];
    for (const d of diagonals) {
      if (d !== -1) {
        addHighwayEdge(campIdx, d);
      }
    }
  }

  // 4. Railroad edges from straight lines
  for (const line of RAILROAD_STRAIGHT_LINES) {
    for (let i = 0; i < line.length - 1; i++) {
      addRailroadEdge(line[i], line[i + 1]);
    }
  }
})();

// Layout conversion helpers
// A player's blueprint arranges 25 pieces on their 30 positions (0..29)
// For White (bottom), player relative 0..29 maps to board row 6..11:
// - Relative row 0 (Front line) -> Board row 6
// - Relative row 5 (Base line)  -> Board row 11
// Board index = (6 + relRow) * 5 + relCol = 30 + relIndex

// For Black (top), player view has Front line at bottom of player's setup screen:
// - Relative row 0 (Front line) -> Board row 5
// - Relative row 5 (Base line)  -> Board row 0
// Board index = (5 - relRow) * 5 + (4 - relCol) or (5 - relRow) * 5 + relCol
export function relativeIndexToBoardIndex(relIndex: number, color: PieceColor): number {
  const relRow = Math.floor(relIndex / BOARD_COLS);
  const relCol = relIndex % BOARD_COLS;

  if (color === 'white') {
    // White is at the bottom (rows 6..11).
    // relRow 0 is row 6 (front line), relRow 5 is row 11 (base line).
    return (6 + relRow) * BOARD_COLS + relCol;
  } else {
    // Black is at the top (rows 0..5).
    // relRow 0 is row 5 (front line), relRow 5 is row 0 (base line).
    // Symmetrically mirrored across center so left and right match player perspective
    return (5 - relRow) * BOARD_COLS + (4 - relCol);
  }
}

export function boardIndexToRelativeIndex(boardIndex: number, color: PieceColor): number {
  const row = Math.floor(boardIndex / BOARD_COLS);
  const col = boardIndex % BOARD_COLS;

  if (color === 'white') {
    const relRow = row - 6;
    return relRow * BOARD_COLS + col;
  } else {
    const relRow = 5 - row;
    const relCol = 4 - col;
    return relRow * BOARD_COLS + relCol;
  }
}

// Relative layout constants for deployment validation
export const RELATIVE_CAMPS = [6, 8, 12, 16, 18]; // 5 camps (cannot place pieces)
export const RELATIVE_HEADQUARTERS = [26, 28];    // 2 base camps (one must have flag)
export const RELATIVE_FRONT_ROW = [0, 1, 2, 3, 4]; // Row 1 (cannot place bombs by rule 4A)
export const RELATIVE_BACK_ROWS = [
  20, 21, 22, 23, 24, // Row 5
  25, 26, 27, 28, 29  // Row 6
];
