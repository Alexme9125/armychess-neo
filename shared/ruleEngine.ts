import { 
  Piece, 
  PieceColor, 
  RuleConfig, 
  ClashOutcome, 
  PIECE_CONFIG,
  GameState,
  PieceType 
} from './types.js';
import { 
  ALL_CAMPS, 
  ALL_HEADQUARTERS, 
  HIGHWAY_ADJACENCY, 
  RAILROAD_ADJACENCY, 
  RAILROAD_POINTS, 
  RAILROAD_STRAIGHT_LINES 
} from './boardData.js';

export interface MoveValidity {
  valid: boolean;
  reason?: string;
}

// Get all legal destinations for a piece at `fromIndex`
export function getLegalMoves(
  board: (Piece | null)[], 
  fromIndex: number, 
  rules: RuleConfig
): number[] {
  const piece = board[fromIndex];
  if (!piece) return [];

  // Landmines and Flag cannot move
  if (piece.type === 'landmine' || piece.type === 'flag') {
    return [];
  }

  // Base camp restriction: If piece is in Headquarter and not movable by rule 5A
  if (ALL_HEADQUARTERS.has(fromIndex) && !rules.baseCampMovable) {
    return [];
  }

  const legalDests = new Set<number>();

  // 1. Highway 1-step moves
  const highwayNeighbors = HIGHWAY_ADJACENCY[fromIndex] || [];
  for (const dest of highwayNeighbors) {
    if (canStepTo(board, piece, dest)) {
      legalDests.add(dest);
    }
  }

  // 2. Railroad moves (only if current position is on railroad)
  if (RAILROAD_POINTS.has(fromIndex)) {
    if (piece.type === 'engineer' && rules.engineerTurns === 'free') {
      // 1A: Free turns for engineer via BFS
      const engineerDests = findEngineerRailroadMoves(board, piece, fromIndex);
      for (const dest of engineerDests) {
        legalDests.add(dest);
      }
    } else {
      // Straight lines on railroad for other pieces (or engineer in straight mode)
      const straightDests = findStraightRailroadMoves(board, piece, fromIndex);
      for (const dest of straightDests) {
        legalDests.add(dest);
      }
    }
  }

  return Array.from(legalDests);
}

// Can a piece move/attack into `dest`
function canStepTo(board: (Piece | null)[], piece: Piece, dest: number): boolean {
  const targetPiece = board[dest];
  if (!targetPiece) return true; // Empty station/camp/hq

  // Cannot step onto friendly piece
  if (targetPiece.color === piece.color) return false;

  // Enemy piece in Camp cannot be attacked (safe zone)
  if (ALL_CAMPS.has(dest)) return false;

  return true;
}

// Straight line railroad movement:
// Find all railroad lines containing `fromIndex`, move in both directions until blocked
function findStraightRailroadMoves(board: (Piece | null)[], piece: Piece, fromIndex: number): number[] {
  const dests: number[] = [];

  for (const line of RAILROAD_STRAIGHT_LINES) {
    const idx = line.indexOf(fromIndex);
    if (idx === -1) continue;

    // Move backward along line
    for (let i = idx - 1; i >= 0; i--) {
      const pos = line[i];
      const target = board[pos];
      if (!target) {
        dests.push(pos);
      } else {
        if (target.color !== piece.color && !ALL_CAMPS.has(pos)) {
          dests.push(pos); // Can attack first obstacle if enemy not in camp
        }
        break; // Blocked
      }
    }

    // Move forward along line
    for (let i = idx + 1; i < line.length; i++) {
      const pos = line[i];
      const target = board[pos];
      if (!target) {
        dests.push(pos);
      } else {
        if (target.color !== piece.color && !ALL_CAMPS.has(pos)) {
          dests.push(pos);
        }
        break;
      }
    }
  }

  return dests;
}

// Engineer BFS railroad pathfinder with turning (Rule 1A)
function findEngineerRailroadMoves(board: (Piece | null)[], piece: Piece, fromIndex: number): number[] {
  const dests: number[] = [];
  const visited = new Set<number>([fromIndex]);
  const queue: number[] = [fromIndex];

  while (queue.length > 0) {
    const curr = queue.shift()!;
    const neighbors = RAILROAD_ADJACENCY[curr] || [];

    for (const next of neighbors) {
      if (visited.has(next)) continue;
      visited.add(next);

      const target = board[next];
      if (!target) {
        // Empty railroad point, can move here and continue searching
        dests.push(next);
        queue.push(next);
      } else {
        // Occupied: cannot pass through, but if enemy and not in camp, can attack!
        if (target.color !== piece.color && !ALL_CAMPS.has(next)) {
          dests.push(next);
        }
        // Do not add occupied node to queue (cannot path through)
      }
    }
  }

  return dests;
}

// Find full waypoint path from fromIndex to toIndex along actual highway / railroad tracks
export function findMovePath(
  board: (Piece | null)[],
  fromIndex: number,
  toIndex: number,
  pieceType: PieceType,
  rules: RuleConfig
): number[] {
  if (fromIndex === toIndex) return [fromIndex];

  // 1. Direct 1-step along highway
  if (HIGHWAY_ADJACENCY[fromIndex]?.includes(toIndex)) {
    return [fromIndex, toIndex];
  }

  // 2. Straight line railroad
  if (RAILROAD_POINTS.has(fromIndex) && RAILROAD_POINTS.has(toIndex)) {
    for (const line of RAILROAD_STRAIGHT_LINES) {
      const idxFrom = line.indexOf(fromIndex);
      const idxTo = line.indexOf(toIndex);
      if (idxFrom !== -1 && idxTo !== -1) {
        const step = idxTo > idxFrom ? 1 : -1;
        const path: number[] = [];
        for (let i = idxFrom; i !== idxTo + step; i += step) {
          path.push(line[i]);
        }
        return path;
      }
    }

    // 3. Engineer turning corners along railroad: BFS shortest path
    // If rules allow free turns on railroad, find the railroad track path
    if (rules.engineerTurns === 'free') {
      const queue: number[][] = [[fromIndex]];
      const visited = new Set<number>([fromIndex]);

      while (queue.length > 0) {
        const path = queue.shift()!;
        const curr = path[path.length - 1];

        if (curr === toIndex) {
          return path;
        }

        const neighbors = RAILROAD_ADJACENCY[curr] || [];
        for (const next of neighbors) {
          if (visited.has(next)) continue;
          // Intermediate node must be empty; target can be occupied by victim
          if (next === toIndex || !board[next]) {
            visited.add(next);
            queue.push([...path, next]);
          }
        }
      }
    }
  }

  return [fromIndex, toIndex];
}

// Arbitration / Clash resolution:
// When piece A moves to position of piece B
export interface ClashResult {
  outcome: ClashOutcome;
  winnerPiece: Piece | null;
  loserPiece: Piece | null;
  message: string;
  isFlagCaptured: boolean;
}

export function resolveClash(attacker: Piece, defender: Piece, rules: RuleConfig): ClashResult {
  // 1. Capture Flag -> Instant Win
  if (defender.type === 'flag') {
    return {
      outcome: 'game_over',
      winnerPiece: attacker,
      loserPiece: defender,
      message: `${attacker.color === 'black' ? '黑方' : '白方'}【${PIECE_CONFIG[attacker.type].name}】夺取了敌方军旗！`,
      isFlagCaptured: true,
    };
  }

  // 2. Bomb collision: Bomb with any enemy piece -> mutual destruction
  if (attacker.type === 'bomb' || defender.type === 'bomb') {
    return {
      outcome: 'mutual_destruction',
      winnerPiece: null,
      loserPiece: null,
      message: `炸弹引爆！双方棋子同归于尽！`,
      isFlagCaptured: false,
    };
  }

  // 3. Landmine encounter:
  if (defender.type === 'landmine') {
    if (attacker.type === 'engineer') {
      // Engineer clears mine safely
      return {
        outcome: 'attacker_wins',
        winnerPiece: attacker,
        loserPiece: defender,
        message: `工兵巧妙排除了敌方地雷！`,
        isFlagCaptured: false,
      };
    } else {
      // Other piece hits landmine
      if (rules.landmineOutcome === 'survive') {
        // 2B: Mine survives, attacker eliminated
        return {
          outcome: 'defender_wins',
          winnerPiece: defender,
          loserPiece: attacker,
          message: `踩中地雷！进攻方棋子触雷阵亡！`,
          isFlagCaptured: false,
        };
      } else {
        // 2A: Mutual destruction
        return {
          outcome: 'mutual_destruction',
          winnerPiece: null,
          loserPiece: null,
          message: `触雷同归于尽！双方同时阵亡！`,
          isFlagCaptured: false,
        };
      }
    }
  }

  // 4. Standard piece comparison (Rank 1..9)
  const rankA = PIECE_CONFIG[attacker.type].rank;
  const rankB = PIECE_CONFIG[defender.type].rank;

  if (rankA < rankB) {
    // Smaller rank number = higher rank (1 司令 > 2 军长)
    return {
      outcome: 'attacker_wins',
      winnerPiece: attacker,
      loserPiece: defender,
      message: `【${PIECE_CONFIG[attacker.type].name}】击败了【${PIECE_CONFIG[defender.type].name}】！`,
      isFlagCaptured: false,
    };
  } else if (rankA > rankB) {
    return {
      outcome: 'defender_wins',
      winnerPiece: defender,
      loserPiece: attacker,
      message: `【${PIECE_CONFIG[attacker.type].name}】攻坚受挫，被【${PIECE_CONFIG[defender.type].name}】消灭！`,
      isFlagCaptured: false,
    };
  } else {
    // Equal rank -> mutual destruction
    return {
      outcome: 'mutual_destruction',
      winnerPiece: null,
      loserPiece: null,
      message: `双方同为【${PIECE_CONFIG[attacker.type].name}】，同归于尽！`,
      isFlagCaptured: false,
    };
  }
}

// Check if a player has any legal moves left
export function hasLegalMoves(board: (Piece | null)[], color: PieceColor, rules: RuleConfig): boolean {
  for (let i = 0; i < board.length; i++) {
    const p = board[i];
    if (p && p.color === color) {
      const moves = getLegalMoves(board, i, rules);
      if (moves.length > 0) return true;
    }
  }
  return false;
}

// Check if Commander is dead, revealing flag (Rule 3A)
export function checkCommanderDeath(board: (Piece | null)[], color: PieceColor): boolean {
  for (const piece of board) {
    if (piece && piece.color === color && piece.type === 'field_marshal') {
      return false; // Still alive
    }
  }
  return true; // Dead
}
