import { 
  Player, 
  PieceColor, 
  RuleConfig, 
  RoomState, 
  DEFAULT_RULES 
} from '../../shared/types.js';
import { GameSession } from './gameSession.js';
import { blueprintService } from './blueprintService.js';
import { createClassicBalancedLayout } from '../../shared/blueprintCodec.js';

function generateRoomCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export class Room {
  public code: string;
  public hostId: string;
  public blackPlayer: Player | null = null;
  public whitePlayer: Player | null = null;
  public spectators: Map<string, Player> = new Map();
  public rules: RuleConfig = { ...DEFAULT_RULES };
  public gameSession: GameSession | null = null;

  constructor(code: string, hostPlayer: Player) {
    this.code = code;
    this.hostId = hostPlayer.id;
    // Host automatically takes Black seat
    hostPlayer.color = 'black';
    hostPlayer.isHost = true;
    this.blackPlayer = hostPlayer;
  }

  public getPlayer(id: string): Player | null {
    if (this.blackPlayer && this.blackPlayer.id === id) return this.blackPlayer;
    if (this.whitePlayer && this.whitePlayer.id === id) return this.whitePlayer;
    return this.spectators.get(id) || null;
  }

  // Stand up from seat
  public standUp(playerId: string): { success: boolean; message?: string } {
    if (this.gameSession && this.gameSession.state.status === 'playing') {
      return { success: false, message: '对弈进行中无法站起' };
    }

    let player: Player | null = null;
    if (this.blackPlayer && this.blackPlayer.id === playerId) {
      player = this.blackPlayer;
      this.blackPlayer = null;
    } else if (this.whitePlayer && this.whitePlayer.id === playerId) {
      player = this.whitePlayer;
      this.whitePlayer = null;
    }

    if (!player) {
      return { success: false, message: '您不在座位上' };
    }

    player.color = null;
    player.isReady = false;
    this.spectators.set(player.id, player);
    return { success: true };
  }

  // Sit down on an empty seat
  public sitDown(playerId: string, targetColor: PieceColor): { success: boolean; message?: string } {
    if (this.gameSession && this.gameSession.state.status === 'playing') {
      return { success: false, message: '对弈进行中无法坐下' };
    }

    const spectator = this.spectators.get(playerId);
    if (!spectator) {
      return { success: false, message: '玩家不在观战席' };
    }

    if (targetColor === 'black') {
      if (this.blackPlayer) return { success: false, message: '黑方席位已有玩家' };
      this.spectators.delete(playerId);
      spectator.color = 'black';
      spectator.isReady = false;
      this.blackPlayer = spectator;
    } else {
      if (this.whitePlayer) return { success: false, message: '白方席位已有玩家' };
      this.spectators.delete(playerId);
      spectator.color = 'white';
      spectator.isReady = false;
      this.whitePlayer = spectator;
    }

    return { success: true };
  }

  // Add spectator
  public addSpectator(player: Player) {
    player.color = null;
    player.isReady = false;
    this.spectators.set(player.id, player);
  }

  // Remove player (disconnect or exit)
  public removePlayer(playerId: string): { gameEnded: boolean; winner?: PieceColor } {
    let gameEnded = false;
    let winner: PieceColor | undefined;

    const wasBlack = this.blackPlayer && this.blackPlayer.id === playerId;
    const wasWhite = this.whitePlayer && this.whitePlayer.id === playerId;

    if (wasBlack || wasWhite) {
      if (this.gameSession && this.gameSession.state.status === 'playing') {
        // Player exited during active game -> Game over, opponent wins
        gameEnded = true;
        winner = wasBlack ? 'white' : 'black';
        this.gameSession.state.status = 'ended';
        this.gameSession.state.winner = winner;
        this.gameSession.state.winReason = `对家选手退出了房间，本局结束，${winner === 'black' ? '黑方' : '白方'}获胜！`;
      }

      if (wasBlack) this.blackPlayer = null;
      if (wasWhite) this.whitePlayer = null;
    } else {
      this.spectators.delete(playerId);
    }

    // Reassign host if host left
    if (this.hostId === playerId) {
      if (this.blackPlayer) {
        this.hostId = this.blackPlayer.id;
        this.blackPlayer.isHost = true;
      } else if (this.whitePlayer) {
        this.hostId = this.whitePlayer.id;
        this.whitePlayer.isHost = true;
      } else if (this.spectators.size > 0) {
        const firstSpec = Array.from(this.spectators.values())[0];
        this.hostId = firstSpec.id;
        firstSpec.isHost = true;
      }
    }

    return { gameEnded, winner };
  }

  // Check if both ready and start game
  public tryStartGame(): boolean {
    if (!this.blackPlayer || !this.whitePlayer) return false;
    if (!this.blackPlayer.isReady || !this.whitePlayer.isReady) return false;

    // Load blueprints
    const blackBp = blueprintService.getBlueprint(this.blackPlayer.blueprintCode || '') || {
      code: 'CLASS1',
      name: '标准阵型',
      placements: createClassicBalancedLayout(),
      createdAt: Date.now(),
    };

    const whiteBp = blueprintService.getBlueprint(this.whitePlayer.blueprintCode || '') || {
      code: 'CLASS1',
      name: '标准阵型',
      placements: createClassicBalancedLayout(),
      createdAt: Date.now(),
    };

    this.gameSession = new GameSession(blackBp.placements, whiteBp.placements, this.rules);
    return true;
  }

  public toState(viewerColor: PieceColor | 'referee' | 'spectator'): RoomState {
    return {
      roomCode: this.code,
      hostId: this.hostId,
      blackPlayer: this.blackPlayer,
      whitePlayer: this.whitePlayer,
      spectators: Array.from(this.spectators.values()),
      rules: this.rules,
      game: this.gameSession ? this.gameSession.getMaskedState(viewerColor) : null,
    };
  }
}

class RoomManager {
  private rooms: Map<string, Room> = new Map();

  public createRoom(hostPlayer: Player): Room {
    let code = generateRoomCode();
    while (this.rooms.has(code)) {
      code = generateRoomCode();
    }
    const room = new Room(code, hostPlayer);
    this.rooms.set(code, room);
    return room;
  }

  public getRoom(code: string): Room | null {
    if (!code) return null;
    return this.rooms.get(code.trim()) || null;
  }

  public deleteRoom(code: string) {
    this.rooms.delete(code);
  }

  public findRoomByPlayerId(playerId: string): Room | null {
    for (const room of this.rooms.values()) {
      if (room.getPlayer(playerId)) return room;
    }
    return null;
  }
}

export const roomManager = new RoomManager();
