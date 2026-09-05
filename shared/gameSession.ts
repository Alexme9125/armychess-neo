import { 
  Piece, 
  PieceColor, 
  GameState, 
  RuleConfig, 
  FluidEvent, 
  MoveRecord,
  LayoutPlacement,
  DEFAULT_RULES 
} from './types.js';
import { 
  relativeIndexToBoardIndex, 
  TOTAL_POINTS 
} from './boardData.js';
import { 
  getLegalMoves, 
  resolveClash, 
  hasLegalMoves, 
  checkCommanderDeath 
} from './ruleEngine.js';

export class GameSession {
  public state: GameState;

  constructor(
    blackPlacements: LayoutPlacement[], 
    whitePlacements: LayoutPlacement[], 
    rules: RuleConfig = DEFAULT_RULES
  ) {
    const board: (Piece | null)[] = Array.from({ length: TOTAL_POINTS }, () => null);

    // Initialize Black pieces (rows 0..5)
    for (let i = 0; i < blackPlacements.length; i++) {
      const p = blackPlacements[i];
      const boardIdx = relativeIndexToBoardIndex(p.index, 'black');
      board[boardIdx] = {
        id: `black-${i}-${p.pieceType}`,
        type: p.pieceType,
        color: 'black',
        position: boardIdx,
        isRevealed: rules.gameMode === 'mingqi',
      };
    }

    // Initialize White pieces (rows 6..11)
    for (let i = 0; i < whitePlacements.length; i++) {
      const p = whitePlacements[i];
      const boardIdx = relativeIndexToBoardIndex(p.index, 'white');
      board[boardIdx] = {
        id: `white-${i}-${p.pieceType}`,
        type: p.pieceType,
        color: 'white',
        position: boardIdx,
        isRevealed: rules.gameMode === 'mingqi',
      };
    }

    this.state = {
      board,
      turn: 'black', // Black plays first by default
      status: 'playing',
      winner: null,
      rules,
      blackFlagRevealed: rules.gameMode === 'mingqi',
      whiteFlagRevealed: rules.gameMode === 'mingqi',
      moveCount: 0,
      lastMove: null,
      fluidEvent: null,
    };
  }

  // Execute a move from `from` to `to`
  public makeMove(from: number, to: number, playerColor: PieceColor): { success: boolean; message?: string } {
    if (this.state.status !== 'playing') {
      return { success: false, message: '游戏未在进行中' };
    }

    if (this.state.turn !== playerColor) {
      return { success: false, message: '尚未轮到您的回合' };
    }

    const piece = this.state.board[from];
    if (!piece || piece.color !== playerColor) {
      return { success: false, message: '无法操作该棋子' };
    }

    const legalMoves = getLegalMoves(this.state.board, from, this.state.rules);
    if (!legalMoves.includes(to)) {
      return { success: false, message: '不合法的移动路径' };
    }

    const targetPiece = this.state.board[to];
    let fluidEvent: FluidEvent | null = null;
    let moveRecord: MoveRecord;

    if (!targetPiece) {
      // 1. Normal Step to Empty Slot
      this.state.board[to] = { ...piece, position: to };
      this.state.board[from] = null;

      moveRecord = {
        from,
        to,
        player: playerColor,
        outcome: 'move',
        timestamp: Date.now(),
      };
    } else {
      // 2. Combat / Clash Resolution
      const clash = resolveClash(piece, targetPiece, this.state.rules);

      if (clash.outcome === 'attacker_wins') {
        // Attacker wins -> Liquid Fusion
        fluidEvent = {
          id: `fluid-${Date.now()}`,
          type: 'fusion',
          fromPos: from,
          toPos: to,
          winnerColor: piece.color,
          loserColor: targetPiece.color,
          winnerType: piece.type,
          loserType: targetPiece.type,
          isMutual: false,
        };

        this.state.board[to] = { ...piece, position: to, isRevealed: this.state.rules.gameMode === 'mingqi' || piece.isRevealed };
        this.state.board[from] = null;

        moveRecord = {
          from,
          to,
          player: playerColor,
          outcome: 'attacker_wins',
          timestamp: Date.now(),
          attackerType: piece.type,
          defenderType: targetPiece.type,
        };
      } else if (clash.outcome === 'defender_wins') {
        // Defender wins -> Attacker melts into defender (Liquid Fusion)
        fluidEvent = {
          id: `fluid-${Date.now()}`,
          type: 'fusion',
          fromPos: from,
          toPos: to,
          winnerColor: targetPiece.color,
          loserColor: piece.color,
          winnerType: targetPiece.type,
          loserType: piece.type,
          isMutual: false,
        };

        this.state.board[from] = null;
        // Defender remains at `to`
        this.state.board[to] = { ...targetPiece, isRevealed: this.state.rules.gameMode === 'mingqi' || targetPiece.isRevealed };

        moveRecord = {
          from,
          to,
          player: playerColor,
          outcome: 'defender_wins',
          timestamp: Date.now(),
          attackerType: piece.type,
          defenderType: targetPiece.type,
        };
      } else if (clash.outcome === 'mutual_destruction') {
        // Mutual Destruction -> Liquid Impact & Splash Dispersal
        fluidEvent = {
          id: `fluid-${Date.now()}`,
          type: 'splash',
          fromPos: from,
          toPos: to,
          winnerColor: undefined,
          loserColor: undefined,
          winnerType: piece.type,
          loserType: targetPiece.type,
          isMutual: true,
        };

        this.state.board[from] = null;
        this.state.board[to] = null;

        moveRecord = {
          from,
          to,
          player: playerColor,
          outcome: 'mutual_destruction',
          timestamp: Date.now(),
          attackerType: piece.type,
          defenderType: targetPiece.type,
        };
      } else if (clash.outcome === 'game_over') {
        // Captured Flag
        fluidEvent = {
          id: `fluid-${Date.now()}`,
          type: 'fusion',
          fromPos: from,
          toPos: to,
          winnerColor: piece.color,
          loserColor: targetPiece.color,
          winnerType: piece.type,
          loserType: targetPiece.type,
        };

        this.state.board[to] = { ...piece, position: to, isRevealed: true };
        this.state.board[from] = null;

        moveRecord = {
          from,
          to,
          player: playerColor,
          outcome: 'game_over',
          timestamp: Date.now(),
          attackerType: piece.type,
          defenderType: targetPiece.type,
        };

        this.state.status = 'ended';
        this.state.winner = playerColor;
        this.state.winReason = `${playerColor === 'black' ? '黑方' : '白方'}成功斩获敌方军旗！`;
      } else {
        return { success: false, message: '未知冲突结果' };
      }
    }

    this.state.lastMove = moveRecord;
    this.state.fluidEvent = fluidEvent;
    this.state.moveCount++;

    // Rule 3A: Check commander death to reveal flag
    if (this.state.rules.commanderDeathReveal) {
      if (!this.state.blackFlagRevealed && checkCommanderDeath(this.state.board, 'black')) {
        this.state.blackFlagRevealed = true;
        this.revealFlag('black');
      }
      if (!this.state.whiteFlagRevealed && checkCommanderDeath(this.state.board, 'white')) {
        this.state.whiteFlagRevealed = true;
        this.revealFlag('white');
      }
    }

    // Check if opponent has any legal moves left
    const nextTurn: PieceColor = playerColor === 'black' ? 'white' : 'black';
    if (this.state.status === 'playing') {
      if (!hasLegalMoves(this.state.board, nextTurn, this.state.rules)) {
        this.state.status = 'ended';
        this.state.winner = playerColor;
        this.state.winReason = `${nextTurn === 'black' ? '黑方' : '白方'}全军无子可动，判定告负！`;
      } else {
        this.state.turn = nextTurn;
      }
    }

    return { success: true };
  }

  private revealFlag(color: PieceColor) {
    for (let i = 0; i < this.state.board.length; i++) {
      const p = this.state.board[i];
      if (p && p.color === color && p.type === 'flag') {
        this.state.board[i] = { ...p, isRevealed: true };
      }
    }
  }

  // Mask board for players in Dark Chess (Anqi)
  // Observer/Referee sees all, or can request masked view
  public getMaskedState(viewerColor: PieceColor | 'referee' | 'spectator'): GameState {
    if (this.state.rules.gameMode === 'mingqi' || viewerColor === 'referee') {
      return this.state;
    }

    // Clone board with opponent pieces hidden if not revealed
    const maskedBoard = this.state.board.map(piece => {
      if (!piece) return null;
      if (viewerColor === 'spectator') {
        // Spectator in Anqi: show piece color, reveal if isRevealed
        if (piece.isRevealed) return piece;
        return {
          id: piece.id,
          color: piece.color,
          type: 'flag' as const, // placeholder, client renders as hidden
          position: piece.position,
          isRevealed: false,
        };
      }

      // Player view: own pieces are fully visible, enemy pieces are hidden unless revealed
      if (piece.color === viewerColor || piece.isRevealed) {
        return piece;
      }

      return {
        id: piece.id,
        color: piece.color,
        type: 'flag' as const,
        position: piece.position,
        isRevealed: false,
      };
    });

    // In Anqi, mask lastMove and fluidEvent so opponent's hidden piece types are not leaked!
    let maskedLastMove = this.state.lastMove;
    if (maskedLastMove) {
      const attackerIsOpponent = viewerColor === 'spectator' || maskedLastMove.player !== viewerColor;
      const defenderColor = maskedLastMove.player === 'black' ? 'white' : 'black';
      const defenderIsOpponent = viewerColor === 'spectator' || defenderColor !== viewerColor;

      maskedLastMove = {
        ...maskedLastMove,
        attackerType: attackerIsOpponent ? undefined : maskedLastMove.attackerType,
        defenderType: defenderIsOpponent ? undefined : maskedLastMove.defenderType,
      };
    }

    let maskedFluidEvent = this.state.fluidEvent;
    if (maskedFluidEvent) {
      const winnerIsOpponent = viewerColor === 'spectator' || maskedFluidEvent.winnerColor !== viewerColor;
      const loserIsOpponent = viewerColor === 'spectator' || maskedFluidEvent.loserColor !== viewerColor;

      maskedFluidEvent = {
        ...maskedFluidEvent,
        winnerType: winnerIsOpponent ? undefined : maskedFluidEvent.winnerType,
        loserType: loserIsOpponent ? undefined : maskedFluidEvent.loserType,
      };
    }

    return {
      ...this.state,
      board: maskedBoard,
      lastMove: maskedLastMove,
      fluidEvent: maskedFluidEvent,
    };
  }
}
