import { 
  Piece, 
  PieceColor, 
  PieceType,
  RuleConfig, 
  AIPersonality, 
  AIDifficulty,
  PIECE_CONFIG 
} from './types.js';
import { 
  getLegalMoves, 
  resolveClash 
} from './ruleEngine.js';
import { 
  ALL_CAMPS, 
  ALL_HEADQUARTERS, 
  RAILROAD_POINTS, 
  BOARD_COLS,
  BOARD_ROWS 
} from './boardData.js';

export interface AIMove {
  from: number;
  to: number;
  score: number;
}

/**
 * Piece tactical value lookup
 */
export function getPieceValue(type: PieceType): number {
  switch (type) {
    case 'flag': return 100000;
    case 'field_marshal': return 1000;      // 司令 (1)
    case 'corps_commander': return 650;      // 军长 (2)
    case 'division_commander': return 450;   // 师长 (3)
    case 'bomb': return 420;                 // 炸弹 (B)
    case 'brigade_commander': return 320;    // 旅长 (4)
    case 'regiment_commander': return 220;   // 团长 (5)
    case 'battalion_commander': return 150;  // 营长 (6)
    case 'company_commander': return 100;    // 连长 (7)
    case 'engineer': return 95;              // 工兵 (9) - 极高战术排雷与铁路机动价值
    case 'platoon_commander': return 60;     // 排长 (8)
    case 'landmine': return 250;             // 地雷 (M)
    default: return 50;
  }
}

/**
 * Select best AI move according to personality, difficulty, and rules
 */
export function selectAIMove(
  board: (Piece | null)[],
  aiColor: PieceColor,
  personality: AIPersonality = 'balanced',
  rules: RuleConfig,
  difficulty: AIDifficulty = 'normal'
): { from: number; to: number } | null {
  const possibleMoves: AIMove[] = [];
  const opponentColor: PieceColor = aiColor === 'black' ? 'white' : 'black';

  // Opponent base camps & HQs
  const targetHQs = opponentColor === 'black' ? [1, 3] : [56, 58];
  const myHQs = aiColor === 'black' ? [1, 3] : [56, 58];

  // Opponent back two rows (where landmines and flags reside)
  // Black: rows 0 & 1 (indices 0..9)
  // White: rows 10 & 11 (indices 50..59)
  const opponentBackRows = opponentColor === 'black' ? [0, 1] : [10, 11];

  // Locate opponent's revealed Flag (if any)
  let revealedEnemyFlagPos: number | null = null;
  for (let i = 0; i < board.length; i++) {
    const p = board[i];
    if (p && p.color === opponentColor && p.type === 'flag' && (rules.gameMode === 'mingqi' || p.isRevealed)) {
      revealedEnemyFlagPos = i;
      break;
    }
  }

  // Pre-calculate which AI pieces are currently threatened on their current squares
  const currentlyThreatenedAIPieces = new Set<number>();
  if (difficulty !== 'easy') {
    for (let from = 0; from < board.length; from++) {
      const p = board[from];
      if (p && p.color === aiColor && !ALL_CAMPS.has(from)) {
        if (isSquareAttackedByOpponent(board, from, opponentColor, rules)) {
          currentlyThreatenedAIPieces.add(from);
        }
      }
    }
  }

  // Evaluate all legal moves
  for (let from = 0; from < board.length; from++) {
    const piece = board[from];
    if (!piece || piece.color !== aiColor) continue;

    const legalDests = getLegalMoves(board, from, rules);
    const isCurrentlyThreatened = currentlyThreatenedAIPieces.has(from);

    for (const to of legalDests) {
      const score = evaluateMove(
        board,
        piece,
        from,
        to,
        personality,
        difficulty,
        rules,
        targetHQs,
        myHQs,
        opponentColor,
        opponentBackRows,
        revealedEnemyFlagPos,
        isCurrentlyThreatened
      );
      possibleMoves.push({ from, to, score });
    }
  }

  if (possibleMoves.length === 0) return null;

  // Sort descending by evaluated score
  possibleMoves.sort((a, b) => b.score - a.score);

  // Difficulty Tier Differentiation
  if (difficulty === 'easy') {
    // 简单：15% 几率走完全随机步（模拟初学者失误），其余在分数前 40% 的走法中随机挑选
    if (Math.random() < 0.15) {
      const randomMove = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
      return { from: randomMove.from, to: randomMove.to };
    }
    const topCount = Math.max(1, Math.floor(possibleMoves.length * 0.4));
    const pool = possibleMoves.slice(0, topCount);
    const selected = pool[Math.floor(Math.random() * pool.length)];
    return { from: selected.from, to: selected.to };
  } 
  
  if (difficulty === 'normal') {
    // 正常：在前 3 个高分走法中选一步
    const topScore = possibleMoves[0].score;
    const pool = possibleMoves.slice(0, 3).filter(m => m.score >= topScore - 20);
    const selected = pool[Math.floor(Math.random() * pool.length)];
    return { from: selected.from, to: selected.to };
  }

  // 困难 (Hard)：深思熟虑，极高准确率，精选前 1~2 步
  const topScore = possibleMoves[0].score;
  const pool = possibleMoves.slice(0, 2).filter(m => m.score >= topScore - 6);
  const selected = pool[Math.floor(Math.random() * pool.length)];
  return { from: selected.from, to: selected.to };
}

/**
 * Checks if a board position is currently under direct legal attack by any opponent piece
 */
function isSquareAttackedByOpponent(
  board: (Piece | null)[],
  targetSquare: number,
  opponentColor: PieceColor,
  rules: RuleConfig
): boolean {
  if (ALL_CAMPS.has(targetSquare)) return false; // 行营绝对安全

  for (let i = 0; i < board.length; i++) {
    const oppPiece = board[i];
    if (!oppPiece || oppPiece.color !== opponentColor) continue;
    const oppMoves = getLegalMoves(board, i, rules);
    if (oppMoves.includes(targetSquare)) {
      return true;
    }
  }
  return false;
}

/**
 * 2-ply threat counter-attack simulation:
 * Simulates placing piece at `to` and checks opponent's best response
 */
function evaluateCounterThreatPenalty(
  board: (Piece | null)[],
  movingPiece: Piece,
  from: number,
  to: number,
  opponentColor: PieceColor,
  rules: RuleConfig,
  difficulty: AIDifficulty
): number {
  if (ALL_CAMPS.has(to)) {
    return 0; // 进入行营免疫一切反击
  }

  // Create lightweight simulated board
  const simBoard = board.slice();
  simBoard[from] = null;
  simBoard[to] = movingPiece;

  let maxPenalty = 0;
  const myValue = getPieceValue(movingPiece.type);

  for (let i = 0; i < simBoard.length; i++) {
    const oppPiece = simBoard[i];
    if (!oppPiece || oppPiece.color !== opponentColor) continue;

    const oppMoves = getLegalMoves(simBoard, i, rules);
    if (oppMoves.includes(to)) {
      // Opponent can hit our piece next turn!
      if (rules.gameMode === 'mingqi' || oppPiece.isRevealed) {
        const clash = resolveClash(oppPiece, movingPiece, rules);
        if (clash.outcome === 'attacker_wins') {
          // Opponent captures us for free
          const penalty = myValue * (difficulty === 'hard' ? 1.6 : 1.2);
          if (penalty > maxPenalty) maxPenalty = penalty;
        } else if (clash.outcome === 'mutual_destruction') {
          if (oppPiece.type === 'bomb') {
            // Opponent trades bomb for our piece
            const penalty = myValue > 400 ? (myValue - 400) * 1.4 : 0;
            if (penalty > maxPenalty) maxPenalty = penalty;
          }
        }
      } else {
        // Dark chess (Anqi) - Opponent piece identity unrevealed
        if (difficulty === 'hard') {
          // In hard mode, don't leave high officers undefended in opponent reach
          if (movingPiece.type === 'field_marshal' || movingPiece.type === 'corps_commander') {
            const riskPenalty = 280;
            if (riskPenalty > maxPenalty) maxPenalty = riskPenalty;
          } else if (movingPiece.type === 'division_commander' || movingPiece.type === 'bomb') {
            const riskPenalty = 140;
            if (riskPenalty > maxPenalty) maxPenalty = riskPenalty;
          }
        }
      }
    }
  }

  return maxPenalty;
}

/**
 * Comprehensive move evaluation
 */
function evaluateMove(
  board: (Piece | null)[],
  piece: Piece,
  from: number,
  to: number,
  personality: AIPersonality,
  difficulty: AIDifficulty,
  rules: RuleConfig,
  targetHQs: number[],
  myHQs: number[],
  opponentColor: PieceColor,
  opponentBackRows: number[],
  revealedEnemyFlagPos: number | null,
  isCurrentlyThreatened: boolean
): number {
  let score = 0;
  const targetPiece = board[to];

  const fromRow = Math.floor(from / BOARD_COLS);
  const toRow = Math.floor(to / BOARD_COLS);
  const fromCol = from % BOARD_COLS;
  const toCol = to % BOARD_COLS;

  // Forward direction for AI
  const isMovingForward = piece.color === 'white' ? toRow < fromRow : toRow > fromRow;
  const forwardSteps = piece.color === 'white' ? fromRow - toRow : toRow - fromRow;

  // ---------------------------------------------------------
  // 1. Target Square Clash Evaluation
  // ---------------------------------------------------------
  if (targetPiece) {
    // A. Win the game immediately if capturing flag!
    if (targetPiece.type === 'flag' || to === revealedEnemyFlagPos) {
      return 999999;
    }

    if (rules.gameMode === 'mingqi' || targetPiece.isRevealed) {
      // Known opponent piece identity
      const clash = resolveClash(piece, targetPiece, rules);
      const enemyValue = getPieceValue(targetPiece.type);

      if (clash.outcome === 'attacker_wins') {
        score += enemyValue + 160;
      } else if (clash.outcome === 'mutual_destruction') {
        if (piece.type === 'bomb') {
          // Bomb trading is great if enemy is division commander or higher
          score += enemyValue >= 400 ? enemyValue - 100 : -120;
        } else {
          // Equal rank exchange
          const myVal = getPieceValue(piece.type);
          score += (enemyValue >= myVal) ? 30 : -50;
        }
      } else {
        // Defender wins: AI loses its piece!
        score -= (getPieceValue(piece.type) * 1.5) + 300;
      }
    } else {
      // Dark Chess (Anqi) - Target is unrevealed enemy piece!
      const isTargetInBackRows = opponentBackRows.includes(toRow);

      if (isTargetInBackRows) {
        // High likelihood of Landmine or Flag!
        if (piece.type === 'engineer') {
          // Engineers are meant to defuse back-row mines!
          score += (difficulty === 'hard' ? 240 : 160);
        } else if (piece.type === 'bomb') {
          // Bomb can blow up stubborn defense or mine
          score += (difficulty === 'hard' ? 120 : 80);
        } else if (piece.type === 'field_marshal' || piece.type === 'corps_commander' || piece.type === 'division_commander') {
          // Suicidal for high officers to blind-strike back rows!
          if (difficulty === 'hard') {
            score -= 650; // Strictly forbidden in Hard
          } else if (difficulty === 'normal') {
            score -= 320;
          } else {
            score += 20; // Naive
          }
        } else {
          // Low rank pieces probing
          score += (difficulty === 'hard' ? 40 : 20);
        }
      } else {
        // Front & mid-ranks in Anqi
        if (personality === 'aggressive') {
          if (piece.type === 'field_marshal' || piece.type === 'corps_commander') {
            score += 110; // Bold spearhead
          } else if (piece.type === 'bomb') {
            score += 85;
          } else if (piece.type === 'engineer') {
            score += 55;
          } else {
            score += 35;
          }
        } else if (personality === 'cautious') {
          if (piece.type === 'engineer' || piece.type === 'platoon_commander' || piece.type === 'company_commander') {
            score += 90; // Probe with expendable vanguards
          } else if (piece.type === 'field_marshal' || piece.type === 'corps_commander') {
            score -= (difficulty === 'hard' ? 90 : 40); // Preserve big commanders
          } else if (piece.type === 'bomb') {
            score += 45;
          } else {
            score += 20;
          }
        } else { // balanced
          if (piece.type === 'engineer' || piece.type === 'platoon_commander' || piece.type === 'company_commander') {
            score += 70;
          } else if (piece.type === 'field_marshal' || piece.type === 'corps_commander') {
            score += 40;
          } else if (piece.type === 'bomb') {
            score += 70;
          } else {
            score += 30;
          }
        }
      }

      // Attacking an enemy headquarter (might be the Flag!)
      if (targetHQs.includes(to)) {
        score += 350;
      }
    }
  }

  // ---------------------------------------------------------
  // 2. Direct Flag Sniping (If Enemy Flag Location is Known)
  // ---------------------------------------------------------
  if (revealedEnemyFlagPos !== null) {
    const flagRow = Math.floor(revealedEnemyFlagPos / BOARD_COLS);
    const flagCol = revealedEnemyFlagPos % BOARD_COLS;
    const prevDist = Math.abs(fromRow - flagRow) + Math.abs(fromCol - flagCol);
    const newDist = Math.abs(toRow - flagRow) + Math.abs(toCol - flagCol);

    if (newDist < prevDist) {
      // Getting closer to victory!
      score += (prevDist - newDist) * (difficulty === 'hard' ? 60 : 35);
      if (piece.type === 'engineer' || piece.type === 'division_commander' || piece.type === 'corps_commander' || piece.type === 'field_marshal') {
        score += 50;
      }
    }
  }

  // ---------------------------------------------------------
  // 3. Self-Defense & Threat Evasion (Saving Endangered Pieces)
  // ---------------------------------------------------------
  if (isCurrentlyThreatened && difficulty !== 'easy') {
    const myVal = getPieceValue(piece.type);
    if (ALL_CAMPS.has(to)) {
      // Escaping directly into a Camp: Complete safety!
      score += (myVal * 0.8) + 80;
    } else {
      // Check if the destination is safe from attack
      const destIsSafe = !isSquareAttackedByOpponent(board, to, opponentColor, rules);
      if (destIsSafe) {
        score += (myVal * 0.6) + 40;
      }
    }
  }

  // ---------------------------------------------------------
  // 4. Counter-Threat Penalty (2-ply lookahead in Normal & Hard)
  // ---------------------------------------------------------
  if (difficulty !== 'easy') {
    const counterPenalty = evaluateCounterThreatPenalty(
      board,
      piece,
      from,
      to,
      opponentColor,
      rules,
      difficulty
    );
    score -= counterPenalty;
  }

  // ---------------------------------------------------------
  // 5. Camps (Safe Havens & Tactical Anchors)
  // ---------------------------------------------------------
  if (ALL_CAMPS.has(to)) {
    if (personality === 'cautious') {
      if (piece.type === 'field_marshal' || piece.type === 'corps_commander' || piece.type === 'division_commander') {
        score += 70; // Big officer taking safe refuge
      } else {
        score += 35;
      }
    } else if (personality === 'balanced') {
      score += 35;
    } else { // aggressive
      score += 15;
    }
  }

  // ---------------------------------------------------------
  // 6. Railroad Mobility (Rapid Transit)
  // ---------------------------------------------------------
  if (RAILROAD_POINTS.has(to)) {
    if (piece.type === 'engineer') {
      // Engineer on railroad has infinite turns capability
      score += 45;
    } else if (personality === 'aggressive') {
      score += 35;
    } else if (personality === 'balanced') {
      score += 20;
    } else {
      score += 10;
    }
  }

  // ---------------------------------------------------------
  // 7. Forward Progression & Headquarters Pressure
  // ---------------------------------------------------------
  if (isMovingForward) {
    if (personality === 'aggressive') {
      score += forwardSteps * 25;
    } else if (personality === 'balanced') {
      score += forwardSteps * 15;
    } else { // cautious
      score += forwardSteps * 8;
    }
  }

  // Approaching enemy headquarters
  for (const hq of targetHQs) {
    const hqRow = Math.floor(hq / BOARD_COLS);
    const prevDist = Math.abs(fromRow - hqRow);
    const newDist = Math.abs(toRow - hqRow);
    if (newDist < prevDist) {
      score += (personality === 'aggressive' ? 22 : 12);
    }
  }

  // Defending own headquarters (Cautious AI bonus)
  if (personality === 'cautious') {
    for (const hq of myHQs) {
      const hqRow = Math.floor(hq / BOARD_COLS);
      if (Math.abs(toRow - hqRow) <= 2) {
        score += 25; // Guarding rear base
      }
    }
  }

  // ---------------------------------------------------------
  // 8. Controlled Jitter (Variance for Living Play)
  // ---------------------------------------------------------
  if (difficulty === 'easy') {
    score += Math.random() * 35;
  } else if (difficulty === 'normal') {
    score += Math.random() * 8;
  } else { // hard
    score += Math.random() * 2;
  }

  return score;
}
